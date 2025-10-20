# Supabase Storage Setup for Listing Photos

## Steps to Set Up Storage Bucket

### 1. Create Storage Bucket
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New Bucket"**
4. Configure the bucket:
   - **Name**: `listing-photos`
   - **Public**: Enable (so photos can be displayed on platforms)
   - **File size limit**: 5 MB (recommended for photos)
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`, `image/heic`

### 2. Set Up Storage Policies

After creating the bucket, set up Row Level Security (RLS) policies:

#### Policy 1: Allow authenticated users to upload their own photos
```sql
CREATE POLICY "Users can upload own listing photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 2: Allow users to read their own photos
```sql
CREATE POLICY "Users can view own listing photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### Policy 3: Allow public read access (for platforms to display images)
```sql
CREATE POLICY "Public can view listing photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');
```

#### Policy 4: Allow users to delete their own photos
```sql
CREATE POLICY "Users can delete own listing photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Folder Structure

Photos will be organized by user ID:
```
listing-photos/
├── {user_id}/
│   ├── {listing_id}_1.jpg
│   ├── {listing_id}_2.jpg
│   └── {listing_id}_3.jpg
└── ...
```

### 4. Usage in Application

**Upload Photo:**
```typescript
import { supabase } from '@/lib/supabase';

async function uploadListingPhoto(userId: string, listingId: string, file: File, index: number) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${listingId}_${index}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('listing-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('listing-photos')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

**Get Photo URL:**
```typescript
const { data } = supabase.storage
  .from('listing-photos')
  .getPublicUrl(`${userId}/${listingId}_1.jpg`);

console.log(data.publicUrl); // Use this URL in your listings
```

**Delete Photo:**
```typescript
await supabase.storage
  .from('listing-photos')
  .remove([`${userId}/${listingId}_1.jpg`]);
```

### 5. Environment Variables

Ensure you have these in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6. Image Optimization Tips

- **Compress before upload**: Use client-side compression (browser-image-compression library)
- **Max size**: Limit to 5MB per photo
- **Formats**: Accept JPEG, PNG, WebP, HEIC
- **Max photos per listing**: Recommend 6-8 photos (most platforms support this)
- **Dimensions**: Resize to max 2000x2000px before upload

### 7. Cost Considerations

Supabase Storage pricing (as of 2025):
- **Free tier**: 1 GB storage, 2 GB bandwidth
- **Pro tier**: 100 GB storage, 200 GB bandwidth included
- **Overage**: $0.021/GB storage, $0.09/GB bandwidth

With photo compression (avg 500KB per photo):
- **1 GB = ~2,000 photos**
- **100 GB = ~200,000 photos**

## Verification Checklist

- [ ] Bucket `listing-photos` created
- [ ] Bucket set to public
- [ ] All 4 storage policies created
- [ ] File size limit set (5MB recommended)
- [ ] MIME types configured
- [ ] Tested upload from application
- [ ] Tested public URL access
- [ ] Tested delete functionality
