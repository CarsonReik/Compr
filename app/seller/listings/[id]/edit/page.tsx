'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { POSHMARK_COLORS, suggestPoshmarkCategory, extractColors, formatCategoryPath } from '@/lib/poshmark-categories';

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
  const [tags, setTags] = useState('');
  const [sku, setSku] = useState('');
  const [upc, setUpc] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [floorPrice, setFloorPrice] = useState('');

  // Platform-specific fields - eBay
  const [ebayCategoryId, setEbayCategoryId] = useState('');
  const [ebayReturnPolicy, setEbayReturnPolicy] = useState<'30_days' | '60_days' | 'no_returns'>('30_days');
  const [ebayShippingService, setEbayShippingService] = useState<'economy' | 'standard' | 'expedited'>('standard');

  // Platform-specific fields - Poshmark
  const [poshmarkColor, setPoshmarkColor] = useState<string[]>([]);
  const [poshmarkNewWithTags, setPoshmarkNewWithTags] = useState(false);
  const [poshmarkCategory, setPoshmarkCategory] = useState('');

  // Advanced settings toggle
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showPoshmarkSettings, setShowPoshmarkSettings] = useState(false);

  // Category suggestion state
  const [categorySuggestions, setCategorySuggestions] = useState<Array<{categoryId: string; categoryName: string}>>([]);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

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

      // Populate crosslisting fields
      if (data.tags && Array.isArray(data.tags)) {
        setTags(data.tags.join(', '));
      }
      setSku(data.sku || '');
      setUpc(data.upc || '');
      setOriginalPrice(data.original_price ? data.original_price.toString() : '');
      setFloorPrice(data.floor_price ? data.floor_price.toString() : '');

      // Populate platform-specific fields - eBay
      if (data.platform_metadata?.ebay) {
        setEbayCategoryId(data.platform_metadata.ebay.category_id || '');
        setEbayReturnPolicy(data.platform_metadata.ebay.return_policy || '30_days');
        setEbayShippingService(data.platform_metadata.ebay.shipping_service || 'standard');
      }

      // Populate platform-specific fields - Poshmark
      setPoshmarkColor(data.poshmark_color || []);
      setPoshmarkNewWithTags(data.poshmark_new_with_tags || false);
      setPoshmarkCategory(data.poshmark_category || '');

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

  const handleSuggestCategory = async () => {
    if (!title || !userId) {
      setCategoryError('Please enter a title first');
      return;
    }

    setSuggestingCategory(true);
    setCategoryError('');

    try {
      const response = await fetch('/api/ebay/suggest-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get suggestions');
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setCategorySuggestions(data.suggestions);
        // Auto-select the first suggestion
        setEbayCategoryId(data.defaultCategoryId || data.suggestions[0].categoryId);
      } else {
        setCategoryError('No category suggestions found');
      }
    } catch (error: any) {
      console.error('Error getting category suggestions:', error);
      setCategoryError(error.message || 'Failed to get category suggestions');
    } finally {
      setSuggestingCategory(false);
    }
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

      // Parse tags
      const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

      // Build platform metadata
      const platformMetadata: any = {
        ebay: {
          category_id: ebayCategoryId || null,
          return_policy: ebayReturnPolicy,
          shipping_service: ebayShippingService,
        }
      };

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
          tags: tagsArray.length > 0 ? tagsArray : null,
          sku: sku || null,
          upc: upc || null,
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          floor_price: floorPrice ? parseFloat(floorPrice) : null,
          platform_metadata: platformMetadata,
          poshmark_color: poshmarkColor.length > 0 ? poshmarkColor : null,
          poshmark_new_with_tags: poshmarkNewWithTags,
          poshmark_category: poshmarkCategory || null,
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-sm border-b border-border">
          <div className="max-w-6xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-accent-foreground font-bold text-xl">C</span>
                </div>
                <h1 className="text-xl font-bold text-foreground">Compr</h1>
              </Link>
              <Link
                href={`/seller/listings/${listingId}`}
                className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                ← Back to Listing
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Edit Listing</h2>
            <p className="text-lg text-muted-foreground">Update your item details and photos</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Photos (up to 8)</h3>

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
                  <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-accent hover:bg-accent/10 transition-colors">
                    <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-foreground">Add Photo</span>
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

              <p className="text-sm text-muted-foreground">
                Recommended: High-quality photos with good lighting. First photo will be your main image.
              </p>
            </div>

            {/* Basic Info */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  maxLength={80}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                  placeholder="e.g., Nike Air Max 270 - White/Black - Size 10"
                />
                <p className="text-xs text-muted-foreground mt-1">{title.length}/80 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                  placeholder="Describe your item's condition, features, and any flaws..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Price * ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="29.99"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
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
            <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Additional Details (Optional)</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="e.g., Sneakers, Electronics, Clothing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="e.g., Nike, Apple, Levi's"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="e.g., Large, 10, 32x34"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="e.g., Blue, Black, Multi-color"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Material
                  </label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="e.g., Cotton, Leather, Polyester"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Weight (oz)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightOz}
                    onChange={(e) => setWeightOz(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    placeholder="For shipping calculations"
                  />
                </div>
              </div>

              {/* New Crosslisting Fields */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tags / Keywords
                      <span className="text-muted-foreground font-normal ml-1">(separate with commas)</span>
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      placeholder="e.g., vintage, handmade, gift, summer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      SKU
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      placeholder="Your inventory number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      UPC / Barcode
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={upc}
                      onChange={(e) => setUpc(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      placeholder="Product barcode"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Original / Retail Price ($)
                      <span className="text-muted-foreground font-normal ml-1">(required for Poshmark)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      placeholder="MSRP or retail price"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Floor Price ($)
                      <span className="text-muted-foreground font-normal ml-1">(for smart pricing)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={floorPrice}
                      onChange={(e) => setFloorPrice(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      placeholder="Lowest auto-discount price"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Platform-Specific Settings */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold text-foreground">⚙️ eBay Settings</h3>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvancedSettings && (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      eBay Category
                      <span className="text-muted-foreground font-normal ml-1">(optional - will auto-detect if not set)</span>
                    </label>

                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={handleSuggestCategory}
                        disabled={!title || suggestingCategory}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {suggestingCategory ? 'Suggesting...' : '✨ Suggest Category'}
                      </button>
                      {categorySuggestions.length > 0 && (
                        <span className="text-sm text-muted-foreground py-2">
                          Found {categorySuggestions.length} suggestion{categorySuggestions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {categorySuggestions.length > 0 ? (
                      <select
                        value={ebayCategoryId}
                        onChange={(e) => setEbayCategoryId(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      >
                        <option value="">Select a category...</option>
                        {categorySuggestions.map((suggestion) => (
                          <option key={suggestion.categoryId} value={suggestion.categoryId}>
                            {suggestion.categoryName} (ID: {suggestion.categoryId})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={ebayCategoryId}
                        onChange={(e) => setEbayCategoryId(e.target.value)}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        placeholder="Optional - leave blank to auto-detect"
                      />
                    )}

                    {categoryError && (
                      <p className="text-xs text-destructive mt-1">{categoryError}</p>
                    )}

                    {!categoryError && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Click "Suggest Category" to get recommendations based on your title
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Return Policy
                    </label>
                    <select
                      value={ebayReturnPolicy}
                      onChange={(e) => setEbayReturnPolicy(e.target.value as any)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    >
                      <option value="30_days">30 days returns accepted</option>
                      <option value="60_days">60 days returns accepted</option>
                      <option value="no_returns">No returns</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Shipping Service
                    </label>
                    <select
                      value={ebayShippingService}
                      onChange={(e) => setEbayShippingService(e.target.value as any)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                    >
                      <option value="economy">Economy (5-7 business days)</option>
                      <option value="standard">Standard (3-5 business days)</option>
                      <option value="expedited">Expedited (1-2 business days)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Poshmark Settings */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <button
                type="button"
                onClick={() => setShowPoshmarkSettings(!showPoshmarkSettings)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold text-foreground">👗 Poshmark Settings</h3>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${showPoshmarkSettings ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPoshmarkSettings && (
                <div className="mt-6 space-y-4">
                  {/* Poshmark Category */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Poshmark Category
                      <span className="text-red-500 ml-1">*</span>
                      <span className="text-muted-foreground font-normal ml-1">(required for Poshmark)</span>
                    </label>
                    <input
                      type="text"
                      value={poshmarkCategory}
                      onChange={(e) => setPoshmarkCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                      placeholder="e.g., Women > Dresses > Maxi"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = suggestPoshmarkCategory(title, description, category);
                        const categoryPath = formatCategoryPath(suggested);
                        setPoshmarkCategory(categoryPath);
                      }}
                      className="mt-2 text-sm text-accent hover:text-accent/80 font-medium"
                    >
                      ✨ Auto-suggest from title
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: Department {'>'} Category {'>'} Subcategory (e.g., &quot;Women {'>'} Bags {'>'} Crossbody Bags&quot;)
                    </p>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Color (select up to 2)
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {POSHMARK_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            if (poshmarkColor.includes(color)) {
                              setPoshmarkColor(poshmarkColor.filter(c => c !== color));
                            } else if (poshmarkColor.length < 2) {
                              setPoshmarkColor([...poshmarkColor, color]);
                            }
                          }}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            poshmarkColor.includes(color)
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'bg-background text-foreground border-border hover:border-accent/50'
                          }`}
                          disabled={!poshmarkColor.includes(color) && poshmarkColor.length >= 2}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const extracted = extractColors(title, description);
                        setPoshmarkColor(extracted);
                      }}
                      className="mt-2 text-sm text-accent hover:text-accent/80 font-medium"
                    >
                      ✨ Auto-detect from title
                    </button>
                  </div>

                  {/* New With Tags */}
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={poshmarkNewWithTags}
                        onChange={(e) => setPoshmarkNewWithTags(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-sm font-medium text-foreground">
                        New With Tags (NWT)
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                      Check this if item has original tags attached
                    </p>
                  </div>

                  {/* Original Price Note */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> Original Price is required for Poshmark listings. Make sure to fill it in the "Crosslisting Settings" section above.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving || !title || !description || !price || photos.length === 0}
                className="flex-1 bg-accent text-accent-foreground font-semibold py-3 rounded-lg hover:bg-accent/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/seller/listings/${listingId}`}
                className="px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors text-center"
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
