import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET = 'plant-images';

/**
 * Uploads a base64 data URL image to the plant-images Supabase bucket.
 * @param {string} base64DataUrl - The base64 data URL (e.g. "data:image/jpeg;base64,...")
 * @param {string} filePath - Path inside the bucket (e.g. "user_id/plant_id/main.jpg")
 * @returns {Promise<string|null>} The public URL of the uploaded image, or null on failure.
 */
export async function uploadImageToBucket(base64DataUrl, filePath) {
  try {
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading image to bucket:', err?.message || err);
    return null;
  }
}

/**
 * Deletes a file from the plant-images bucket.
 * @param {string} filePath - Path inside the bucket.
 */
export async function deleteImageFromBucket(filePath) {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (error) throw error;
  } catch (err) {
    console.error('Error deleting image from bucket:', err?.message || err);
  }
}