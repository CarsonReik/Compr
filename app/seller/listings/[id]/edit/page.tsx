'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface PhotoPreview {
  file?: File;
  preview: string;
  isExisting?: boolean;
}

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const listingId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [condition, setCondition] = useState<'new' | 'like_new' | 'good' | 'fair' | 'poor'>('good');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [material, setMaterial] = useState('');
  const [weightOz, setWeightOz] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchListing();
    }
  }, [userId]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchListing = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Populate form fields
      setTitle(data.title);
      setDescription(data.description);
      setPrice(data.price.toString());
      setQuantity(data.quantity.toString());
      setCondition(data.condition);
      setCategory(data.category || '');
      setBrand(data.brand || '');
      setSize(data.size || '');
      setColor(data.color || '');
      setMaterial(data.material || '');
      setWeightOz(data.weight_oz ? data.weight_oz.toString() : '');

      // Set existing photos
      if (data.photo_urls && data.photo_urls.length > 0) {
        setExistingPhotoUrls(data.photo_urls);
        setPhotos(data.photo_urls.map((url: string) => ({
          preview: url,
          isExisting: true
        })));
      }
    } catch (error) {
      console.error('Error fetching listing:', error);
      router.push('/seller/listings');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PhotoPreview[] = [];
    for (let i = 0; i < Math.min(files.length, 8 - photos.length); i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        newPhotos.push({
          file,
          preview: URL.createObjectURL(file),
          isExisting: false
        });
      }
    }
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (!photo.isExisting && photo.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError('');

    try {
      const photoUrls: string[] = [];

      // Keep existing photos that weren't removed
      const existingPhotosToKeep = photos
        .filter(p => p.isExisting)
        .map(p => p.preview);

      photoUrls.push(...existingPhotosToKeep);

      // Upload new photos
      const newPhotos = photos.filter(p => !p.isExisting && p.file);
      for (let i = 0; i < newPhotos.length; i++) {
        const photo = newPhotos[i];
        if (!photo.file) continue;

        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(fileName, photo.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(fileName);

        photoUrls.push(publicUrl);
      }

      // Update listing in database
      const { error: updateError } = await supabase
        .from('listings')
        .update({
          title,
          description,
          price: parseFloat(price),
          quantity: parseInt(quantity),
          condition,
          category: category || null,
          brand: brand || null,
          size: size || null,
          color: color || null,
          material: material || null,
          weight_oz: weightOz ? parseFloat(weightOz) : null,
          photo_urls: photoUrls,
        })
        .eq('id', listingId);

      if (updateError) throw updateError;

      // Delete removed photos from storage
      const removedPhotos = existingPhotoUrls.filter(url => !existingPhotosToKeep.includes(url));
      for (const url of removedPhotos) {
        // Extract filename from URL
        const urlParts = url.split('/');
        const fileName = `${userId}/${urlParts[urlParts.length - 1]}`;
        await supabase.storage
          .from('listing-photos')
          .remove([fileName]);
      }

      // Redirect to listing detail page
      router.push(`/seller/listings/${listingId}`);
    } catch (err: any) {
      console.error('Error updating listing:', err);
      setError(err.message || 'Failed to update listing');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMxZTQwYWYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0xMCA0MGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60">
          <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold text-slate-900">Compr</h1>
              </Link>
              <Link
                href={`/seller/listings/${listingId}`}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                ← Back to Listing
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Edit Listing</h2>
            <p className="text-lg text-slate-600">Update your item details and photos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Photos (up to 8)</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}

                {photos.length < 8 && (
                  <label className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                    <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-slate-600">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <p className="text-sm text-slate-500">
                Recommended: High-quality photos with good lighting. First photo will be your main image.
              </p>
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={80}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                  placeholder="e.g., Nike Air Max 270 - White/Black - Size 10"
                />
                <p className="text-xs text-slate-500 mt-1">{title.length}/80 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                  placeholder="Describe your item's condition, features, and any flaws..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Price * ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="29.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                >
                  <option value="new">New - Never used, in original packaging</option>
                  <option value="like_new">Like New - Gently used, excellent condition</option>
                  <option value="good">Good - Used with minor wear</option>
                  <option value="fair">Fair - Used with noticeable wear</option>
                  <option value="poor">Poor - Heavy wear, may have damage</option>
                </select>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Additional Details (Optional)</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="e.g., Sneakers, Electronics, Clothing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="e.g., Nike, Apple, Levi's"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="e.g., Large, 10, 32x34"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="e.g., Blue, Black, Multi-color"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="e.g., Cotton, Leather, Polyester"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Weight (oz)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightOz}
                    onChange={(e) => setWeightOz(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-transparent text-slate-900"
                    placeholder="For shipping calculations"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving || !title || !description || !price || photos.length === 0}
                className="flex-1 bg-blue-900 text-white font-semibold py-3 rounded-lg hover:bg-blue-800 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/seller/listings/${listingId}`}
                className="px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
