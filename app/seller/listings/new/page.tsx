'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import MercariSearchableSelect from '@/components/MercariSearchableSelect';

interface PhotoPreview {
  file: File;
  preview: string;
}

interface PriceLookupResult {
  query: string;
  prices: {
    [platform: string]: {
      average: number;
      median: number;
      count: number;
    };
  };
  overallAverage?: number;
  recommendation?: string;
}

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Basic fields
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

  // New crosslisting fields
  const [tags, setTags] = useState('');
  const [sku, setSku] = useState('');
  const [upc, setUpc] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [floorPrice, setFloorPrice] = useState('');

  // Marketplace selection
  const [selectedMarketplaces, setSelectedMarketplaces] = useState({
    ebay: true,
    mercari: true,
    poshmark: true,
    depop: true,
    etsy: true,
  });

  // Platform-specific fields - eBay
  const [ebayReturnPolicy, setEbayReturnPolicy] = useState<'30_days' | '60_days' | 'no_returns'>('30_days');
  const [ebayShippingService, setEbayShippingService] = useState<'economy' | 'standard' | 'expedited'>('standard');
  const [ebayCategoryId, setEbayCategoryId] = useState('');

  // Platform-specific fields - Mercari
  const [mercariShippingPayer, setMercariShippingPayer] = useState<'seller' | 'buyer'>('seller');
  const [mercariCategoryId, setMercariCategoryId] = useState('');
  const [mercariBrandId, setMercariBrandId] = useState('');
  const [mercariWeightLb, setMercariWeightLb] = useState('');
  const [mercariWeightOz, setMercariWeightOz] = useState('');
  const [mercariCarrier, setMercariCarrier] = useState<'usps' | 'ups' | 'fedex'>('usps');
  const [mercariShippingType, setMercariShippingType] = useState<'economy' | 'standard' | 'expedited'>('standard');

  // Platform-specific fields - Poshmark
  const [poshmarkDepartment, setPoshmarkDepartment] = useState<'Women' | 'Men' | 'Kids' | 'Home' | 'Pets'>('Women');
  const [poshmarkSubcategory, setPoshmarkSubcategory] = useState('');

  // Platform-specific fields - Depop
  const [depopStyleTags, setDepopStyleTags] = useState('');
  const [depopShippingFrom, setDepopShippingFrom] = useState('');

  // Platform-specific fields - Etsy
  const [etsyWhoMade, setEtsyWhoMade] = useState<'i_did' | 'someone_else' | 'collective'>('i_did');
  const [etsyWhenMade, setEtsyWhenMade] = useState<string>('2020_2025');
  const [etsyIsSupply, setEtsyIsSupply] = useState(false);
  const [etsyProcessingTime, setEtsyProcessingTime] = useState<'1_2_weeks' | '3_4_weeks' | '5_6_weeks'>('1_2_weeks');

  // Price lookup state
  const [showPriceLookup, setShowPriceLookup] = useState(false);
  const [priceSearchQuery, setPriceSearchQuery] = useState('');
  const [priceLookupLoading, setPriceLookupLoading] = useState(false);
  const [priceLookupResult, setPriceLookupResult] = useState<PriceLookupResult | null>(null);

  // Category suggestion state
  const [categorySuggestions, setCategorySuggestions] = useState<Array<{categoryId: string; categoryName: string}>>([]);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // AI Analysis state
  const [analyzing, setAnalyzing] = useState(false);

  // Advanced settings
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    // Auto-populate price search from title
    if (title) {
      setPriceSearchQuery(title);
    }
  }, [title]);

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

  const handlePriceLookup = async () => {
    if (!priceSearchQuery.trim()) return;

    setPriceLookupLoading(true);
    setPriceLookupResult(null);

    try {
      const response = await fetch(`/api/price-lookup?query=${encodeURIComponent(priceSearchQuery)}`);
      const data = await response.json();

      console.log('Price lookup response:', data);
      console.log('Prices object:', data.prices);
      console.log('Number of platforms:', Object.keys(data.prices || {}).length);

      if (response.ok) {
        setPriceLookupResult(data);
      } else {
        console.error('Price lookup error:', data.error);
      }
    } catch (error) {
      console.error('Price lookup error:', error);
    } finally {
      setPriceLookupLoading(false);
    }
  };

  const useSuggestedPrice = () => {
    if (priceLookupResult?.overallAverage) {
      setPrice(priceLookupResult.overallAverage.toString());
    }
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

  const handleAnalyzePhotos = async () => {
    if (photos.length === 0) return;

    setAnalyzing(true);

    try {
      // Convert the first photo to base64
      const firstPhoto = photos[0].file;
      const reader = new FileReader();

      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(firstPhoto);
      });

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: base64Image,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const data = result.data;

        // Auto-fill form fields with AI suggestions
        if (data.title && !title) setTitle(data.title);
        if (data.description && !description) setDescription(data.description);
        if (data.brand && !brand) setBrand(data.brand);
        if (data.category && !category) setCategory(data.category);
        if (data.size && !size) setSize(data.size);
        if (data.color && !color) setColor(data.color);
        if (data.material && !material) setMaterial(data.material);
        if (data.condition) setCondition(data.condition);
        if (data.tags && data.tags.length > 0 && !tags) {
          setTags(data.tags.join(', '));
        }

        // Auto-populate price search from title
        if (data.title) {
          setPriceSearchQuery(data.title);
        }

        alert('✨ Analysis complete! Fields have been auto-filled. Please review and adjust as needed.');
      } else {
        console.error('Analysis failed:', result.error);
        alert('Failed to analyze image. Please try again or fill fields manually.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze image. Please try again or fill fields manually.');
    } finally {
      setAnalyzing(false);
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
          preview: URL.createObjectURL(file)
        });
      }
    }
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photos[index].preview);
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);
    setPhotos(newPhotos);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIndex !== toIndex) {
      movePhoto(fromIndex, toIndex);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setLoading(true);
    setError('');

    try {
      // Upload photos to Supabase Storage
      const photoUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
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

      // Build platform metadata based on selected marketplaces
      const platformMetadata: any = {};

      if (selectedMarketplaces.ebay) {
        platformMetadata.ebay = {
          return_policy: ebayReturnPolicy,
          shipping_service: ebayShippingService,
          category_id: ebayCategoryId || null,
        };
      }

      if (selectedMarketplaces.mercari) {
        platformMetadata.mercari = {
          floor_price: floorPrice ? parseFloat(floorPrice) : null,
          shipping_payer: mercariShippingPayer,
          category_id: mercariCategoryId || null,
          brand_id: mercariBrandId || null,
          shipping_carrier: mercariCarrier,
          shipping_type: mercariShippingType,
          weight_lb: mercariWeightLb ? parseFloat(mercariWeightLb) : null,
          weight_oz: mercariWeightOz ? parseFloat(mercariWeightOz) : null,
        };
      }

      if (selectedMarketplaces.poshmark) {
        platformMetadata.poshmark = {
          department: poshmarkDepartment,
          subcategory: poshmarkSubcategory || null,
          original_price: originalPrice ? parseFloat(originalPrice) : null,
        };
      }

      if (selectedMarketplaces.depop) {
        platformMetadata.depop = {
          style_tags: depopStyleTags ? depopStyleTags.split(',').map(t => t.trim()).filter(t => t.length > 0) : [],
          shipping_from: depopShippingFrom || null,
        };
      }

      if (selectedMarketplaces.etsy) {
        platformMetadata.etsy = {
          who_made: etsyWhoMade,
          when_made: etsyWhenMade,
          is_supply: etsyIsSupply,
          processing_time: etsyProcessingTime,
        };
      }

      // Create listing in database
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          user_id: userId,
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
          weight_lb: (selectedMarketplaces.mercari && mercariWeightLb) ? parseFloat(mercariWeightLb) : null,
          weight_oz: (selectedMarketplaces.mercari && mercariWeightOz) ? parseFloat(mercariWeightOz) : (weightOz ? parseFloat(weightOz) : null),
          tags: tagsArray.length > 0 ? tagsArray : null,
          sku: sku || null,
          upc: upc || null,
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          floor_price: floorPrice ? parseFloat(floorPrice) : null,
          platform_metadata: platformMetadata,
          photo_urls: photoUrls,
          status: 'draft'
        })
        .select()
        .single();

      if (listingError) throw listingError;

      // Update usage tracking
      const currentPeriod = new Date();
      currentPeriod.setDate(1);
      const periodStart = currentPeriod.toISOString().split('T')[0];

      const { error: usageError } = await supabase.rpc('increment_listings_added', {
        p_user_id: userId,
        p_period_start: periodStart
      });

      if (usageError) {
        console.error('Usage update error:', usageError);
      }

      // Redirect to listings dashboard
      router.push('/seller/listings');
    } catch (err: any) {
      console.error('Error creating listing:', err);
      setError(err.message || 'Failed to create listing');
      setLoading(false);
    }
  };

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
                href="/seller"
                className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Create New Listing</h2>
            <p className="text-lg text-muted-foreground">Add your item details and photos</p>
          </div>

          {/* Marketplace Selection */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Select Marketplaces</h3>
            <p className="text-sm text-muted-foreground mb-4">Choose which platforms you want to list this item on</p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { key: 'ebay', label: 'eBay', emoji: '🏷️' },
                { key: 'mercari', label: 'Mercari', emoji: '📦' },
                { key: 'poshmark', label: 'Poshmark', emoji: '👗' },
                { key: 'depop', label: 'Depop', emoji: '✨' },
                { key: 'etsy', label: 'Etsy', emoji: '🛍️' },
              ].map((marketplace) => (
                <label
                  key={marketplace.key}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedMarketplaces[marketplace.key as keyof typeof selectedMarketplaces]
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMarketplaces[marketplace.key as keyof typeof selectedMarketplaces]}
                    onChange={(e) =>
                      setSelectedMarketplaces({
                        ...selectedMarketplaces,
                        [marketplace.key]: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                  />
                  <span className="text-lg">{marketplace.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{marketplace.label}</span>
                </label>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Photos (up to 8)</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="relative aspect-square cursor-move group"
                  >
                    <Image
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                    />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs px-2 py-1 rounded font-semibold">
                        Main
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 z-10"
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

              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  Recommended: High-quality photos with good lighting. First photo will be your main image. Drag photos to reorder.
                </p>
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAnalyzePhotos}
                    disabled={analyzing}
                    className="shrink-0 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Analyze Photos with AI
                      </>
                    )}
                  </button>
                )}
              </div>
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

              {/* Price Lookup Tool */}
              <div className="border border-accent/30 bg-accent/10 rounded-lg p-4">
                <button
                  type="button"
                  onClick={() => setShowPriceLookup(!showPriceLookup)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    💰 Check Market Prices
                  </span>
                  <svg
                    className={`w-5 h-5 text-muted-foreground transition-transform ${showPriceLookup ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showPriceLookup && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={priceSearchQuery}
                        onChange={(e) => setPriceSearchQuery(e.target.value)}
                        placeholder="Search for similar items..."
                        className="flex-1 px-3 py-2 border border-border rounded text-foreground bg-background text-sm"
                      />
                      <button
                        type="button"
                        onClick={handlePriceLookup}
                        disabled={priceLookupLoading || !priceSearchQuery.trim()}
                        className="px-4 py-2 bg-accent text-accent-foreground rounded hover:opacity-90 disabled:opacity-50 text-sm font-medium transition-all"
                      >
                        {priceLookupLoading ? 'Searching...' : 'Look Up'}
                      </button>
                    </div>

                    {priceLookupResult && Object.keys(priceLookupResult.prices).length > 0 && (
                      <>
                        <div className="bg-card rounded-lg p-4 space-y-2 border border-border">
                          <div className="text-sm font-semibold text-foreground mb-2">Average Prices Found:</div>
                          {Object.entries(priceLookupResult.prices).map(([platform, data]) => (
                            <div key={platform} className="flex justify-between text-sm">
                              <span className="text-muted-foreground capitalize">{platform}:</span>
                              <span className="font-semibold text-foreground">
                                ${data.average.toFixed(2)} ({data.count} listings)
                              </span>
                            </div>
                          ))}
                          {priceLookupResult.overallAverage && (
                            <>
                              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                                <span className="text-foreground font-semibold">Overall Average:</span>
                                <span className="text-accent font-bold text-lg">
                                  ${priceLookupResult.overallAverage.toFixed(2)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={useSuggestedPrice}
                                className="w-full mt-2 px-3 py-2 bg-accent/20 text-accent rounded hover:bg-accent/30 text-sm font-medium transition-colors"
                              >
                                Use This Price
                              </button>
                            </>
                          )}
                        </div>

                        {priceLookupResult.recommendation && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
                            <div className="flex items-start gap-2">
                              <span className="text-lg">🤖</span>
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-blue-900 mb-2">AI Recommendations</div>
                                <div className="text-sm text-blue-800 whitespace-pre-line">
                                  {priceLookupResult.recommendation}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {priceLookupResult && Object.keys(priceLookupResult.prices).length === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                        No pricing data found. Try a different search term.
                      </div>
                    )}
                  </div>
                )}
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
              <h3 className="text-lg font-semibold text-foreground mb-4">Additional Details</h3>

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
                      <span className="text-muted-foreground font-normal ml-1">(separate with commas, max 13 for Etsy)</span>
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
                      <span className="text-muted-foreground font-normal ml-1">(for Mercari smart pricing)</span>
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
                <h3 className="text-lg font-semibold text-foreground">⚙️ Platform-Specific Settings</h3>
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
                <div className="mt-6 space-y-6">
                  {/* eBay Settings */}
                  {selectedMarketplaces.ebay && (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        🏷️ eBay Settings
                      </h4>

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

                  {/* Mercari Settings */}
                  {selectedMarketplaces.mercari && (
                    <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        📦 Mercari Settings
                      </h4>

                      <MercariSearchableSelect
                        value={mercariCategoryId}
                        onChange={setMercariCategoryId}
                        type="category"
                        label="Category"
                        placeholder="Search for a category..."
                        required
                      />

                      <MercariSearchableSelect
                        value={mercariBrandId}
                        onChange={setMercariBrandId}
                        type="brand"
                        label="Brand"
                        placeholder="Search for a brand..."
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Weight (lbs) *
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={mercariWeightLb}
                            onChange={(e) => setMercariWeightLb(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                            placeholder="0"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Weight (oz) *
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="15.9"
                            value={mercariWeightOz}
                            onChange={(e) => setMercariWeightOz(e.target.value)}
                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Preferred Carrier *
                        </label>
                        <select
                          value={mercariCarrier}
                          onChange={(e) => setMercariCarrier(e.target.value as any)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="usps">USPS</option>
                          <option value="ups">UPS</option>
                          <option value="fedex">FedEx</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Shipping Speed *
                        </label>
                        <select
                          value={mercariShippingType}
                          onChange={(e) => setMercariShippingType(e.target.value as any)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="economy">Economy (5-7 business days)</option>
                          <option value="standard">Standard (3-5 business days)</option>
                          <option value="expedited">Expedited (1-2 business days)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Who Pays Shipping? *
                        </label>
                        <select
                          value={mercariShippingPayer}
                          onChange={(e) => setMercariShippingPayer(e.target.value as any)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="seller">Seller pays (prepaid label)</option>
                          <option value="buyer">Buyer pays</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Poshmark Settings */}
                  {selectedMarketplaces.poshmark && (
                    <div className="border border-pink-200 bg-pink-50 rounded-lg p-4 space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        👗 Poshmark Settings
                      </h4>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Department *
                        </label>
                        <select
                          value={poshmarkDepartment}
                          onChange={(e) => setPoshmarkDepartment(e.target.value as any)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="Women">Women</option>
                          <option value="Men">Men</option>
                          <option value="Kids">Kids</option>
                          <option value="Home">Home</option>
                          <option value="Pets">Pets</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Subcategory
                        </label>
                        <input
                          type="text"
                          value={poshmarkSubcategory}
                          onChange={(e) => setPoshmarkSubcategory(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                          placeholder="e.g., Dresses, Shoes, Accessories"
                        />
                      </div>
                    </div>
                  )}

                  {/* Depop Settings */}
                  {selectedMarketplaces.depop && (
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        ✨ Depop Settings
                      </h4>

                      <p className="text-sm text-muted-foreground">
                        All Depop-specific fields are optional but recommended for better visibility
                      </p>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Style Tags
                          <span className="text-muted-foreground font-normal ml-1">(optional, separate with commas)</span>
                        </label>
                        <input
                          type="text"
                          value={depopStyleTags}
                          onChange={(e) => setDepopStyleTags(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                          placeholder="e.g., Y2K, Vintage, Grunge, Streetwear"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Shipping From
                          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={depopShippingFrom}
                          onChange={(e) => setDepopShippingFrom(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                          placeholder="e.g., Los Angeles, CA"
                        />
                      </div>
                    </div>
                  )}

                  {/* Etsy Settings */}
                  {selectedMarketplaces.etsy && (
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4 space-y-4">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        🛍️ Etsy Settings
                      </h4>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Who made it? *
                        </label>
                        <select
                          value={etsyWhoMade}
                          onChange={(e) => setEtsyWhoMade(e.target.value as any)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="i_did">I did</option>
                          <option value="someone_else">Someone else</option>
                          <option value="collective">A member of my collective/shop</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          When was it made? *
                        </label>
                        <select
                          value={etsyWhenMade}
                          onChange={(e) => setEtsyWhenMade(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="made_to_order">Made to order</option>
                          <option value="2020_2025">2020 - 2025</option>
                          <option value="2010_2019">2010 - 2019</option>
                          <option value="2000_2009">2000 - 2009</option>
                          <option value="before_2000">Before 2000</option>
                          <option value="1990s">1990s</option>
                          <option value="1980s">1980s</option>
                          <option value="1970s">1970s</option>
                          <option value="1960s">1960s</option>
                          <option value="1950s">1950s</option>
                          <option value="1940s">1940s</option>
                          <option value="1930s">1930s</option>
                          <option value="1920s">1920s</option>
                          <option value="1910s">1910s</option>
                          <option value="1900s">1900s</option>
                          <option value="1800s">1800s</option>
                          <option value="1700s">1700s</option>
                          <option value="before_1700">Before 1700</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="etsyIsSupply"
                          checked={etsyIsSupply}
                          onChange={(e) => setEtsyIsSupply(e.target.checked)}
                          className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                        />
                        <label htmlFor="etsyIsSupply" className="text-sm font-medium text-foreground">
                          This is a craft supply or tool
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Processing Time *
                        </label>
                        <select
                          value={etsyProcessingTime}
                          onChange={(e) => setEtsyProcessingTime(e.target.value as any)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent text-foreground bg-background"
                        >
                          <option value="1_2_weeks">1-2 weeks</option>
                          <option value="3_4_weeks">3-4 weeks</option>
                          <option value="5_6_weeks">5-6 weeks</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-sm text-foreground">
                    <p className="font-semibold mb-1">💡 Tip:</p>
                    <p>These settings will be used when posting to each platform. You can always change them later for individual listings.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !title || !description || !price || photos.length === 0}
                className="flex-1 bg-accent text-accent-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
              <Link
                href="/seller"
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
