/**
 * Extension polling endpoint
 * Extension polls this endpoint every few seconds to check for new jobs
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const authToken = request.nextUrl.searchParams.get('authToken');

    if (!userId || !authToken) {
      return Response.json({ error: 'Missing authentication' }, { status: 401 });
    }

    // Validate user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'Invalid user' }, { status: 401 });
    }

    // Update last seen
    await supabase
      .from('users')
      .update({
        extension_last_seen: new Date().toISOString(),
      })
      .eq('id', userId);

    // Check for new jobs (created in the last 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

    const { data: newJobs, error: jobsError } = await supabase
      .from('crosslisting_jobs')
      .select('*, listings(*)')
      .eq('user_id', userId)
      .eq('status', 'queued')
      .in('platform', ['poshmark', 'mercari', 'depop'])
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: true });

    if (jobsError) {
      console.error('Error fetching new jobs:', jobsError);
      return Response.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Filter jobs to only include those with active platform connections
    let validJobs = newJobs || [];
    if (validJobs.length > 0) {
      const { data: connections } = await supabase
        .from('platform_connections')
        .select('platform, is_active, encrypted_credentials')
        .eq('user_id', userId)
        .eq('is_active', true)
        .in('platform', ['poshmark', 'mercari', 'depop']);

      const connectedPlatforms = new Set(
        (connections || [])
          .filter(c => c.encrypted_credentials) // Must have credentials
          .map(c => c.platform)
      );

      // Filter out jobs for platforms that aren't properly connected
      validJobs = validJobs.filter(job => connectedPlatforms.has(job.platform));

      // Mark filtered-out jobs as failed
      const invalidJobs = (newJobs || []).filter(job => !connectedPlatforms.has(job.platform));
      if (invalidJobs.length > 0) {
        const invalidJobIds = invalidJobs.map(j => j.job_id);
        await supabase
          .from('crosslisting_jobs')
          .update({
            status: 'failed',
            error_message: 'Platform not connected. Please connect your account in Settings.',
          })
          .in('job_id', invalidJobIds);
      }
    }

    // Mark valid jobs as "processing" to prevent duplicate processing
    if (validJobs.length > 0) {
      const jobIds = validJobs.map((job) => job.job_id);
      await supabase
        .from('crosslisting_jobs')
        .update({ status: 'processing' })
        .in('job_id', jobIds);
    }

    const jobs = validJobs.map((job) => {
      // Check if this is a DELETE operation (has platform_listing_id already set)
      const isDeleteOperation = !!job.platform_listing_id;

      if (isDeleteOperation) {
        // DELETE operation - return minimal data
        return {
          jobId: job.job_id,
          platform: job.platform,
          operation: 'DELETE',
          platformListingId: job.platform_listing_id,
        };
      }

      // CREATE operation - return full listing data
      const listing = job.listings;
      const platformMetadata = listing.platform_metadata || {};

      // Map platform_metadata to flat fields for the extension
      const listingData: any = {
        ...listing,
        // Remove platform_metadata from the top level since we're flattening it
      };

      // Map Mercari-specific fields from platform_metadata
      if (job.platform === 'mercari' && platformMetadata.mercari) {
        listingData.mercari_category = platformMetadata.mercari.category_id || null;
        listingData.mercari_brand_id = platformMetadata.mercari.brand_id || null;
        listingData.mercari_shipping_carrier = platformMetadata.mercari.shipping_carrier || null;
        listingData.mercari_shipping_type = platformMetadata.mercari.shipping_type || null;

        // Override weight fields if Mercari-specific weights are provided
        if (platformMetadata.mercari.weight_lb !== undefined && platformMetadata.mercari.weight_lb !== null) {
          listingData.weight_lb = platformMetadata.mercari.weight_lb;
        }
        if (platformMetadata.mercari.weight_oz !== undefined && platformMetadata.mercari.weight_oz !== null) {
          listingData.weight_oz = platformMetadata.mercari.weight_oz;
        }
      }

      // Map Poshmark-specific fields (if needed)
      if (job.platform === 'poshmark' && platformMetadata.poshmark) {
        listingData.poshmark_department = platformMetadata.poshmark.department || null;
        listingData.poshmark_subcategory = platformMetadata.poshmark.subcategory || null;
      }

      // Map Depop-specific fields (if needed)
      if (job.platform === 'depop' && platformMetadata.depop) {
        listingData.depop_style_tags = platformMetadata.depop.style_tags || null;
        listingData.depop_shipping_from = platformMetadata.depop.shipping_from || null;
      }

      return {
        jobId: job.job_id,
        platform: job.platform,
        operation: 'CREATE',
        listingData,
      };
    });

    return Response.json({
      hasNewJobs: jobs.length > 0,
      jobs,
    });
  } catch (error) {
    console.error('Extension poll error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
