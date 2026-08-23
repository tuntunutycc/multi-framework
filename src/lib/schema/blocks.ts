import { z } from 'zod';

export const HeroMediaSchema = z.object({
  src: z.string().min(1),
  alt: z.string(),
});

export const HeroCtaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});

export const HeroBlockSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  image: HeroMediaSchema,
  cta: HeroCtaSchema.optional(),
});

export type HeroBlockProps = z.infer<typeof HeroBlockSchema>;
export type HeroCta = z.infer<typeof HeroCtaSchema>;
export type HeroMedia = z.infer<typeof HeroMediaSchema>;

/** site_content.data_json for block_type = GalleryBlock */
export const GalleryItemSchema = z.object({
  imageUrl: z.string().min(1),
  caption: z.string().optional(),
});

export const GalleryBlockSchema = z.object({
  title: z.string().optional(),
  items: z.array(GalleryItemSchema),
});

export type GalleryItem = z.infer<typeof GalleryItemSchema>;
export type GalleryBlockProps = z.infer<typeof GalleryBlockSchema>;

/** site_content.data_json for block_type = ContactBlock */
export const ContactBlockSchema = z.object({
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  openingHours: z.string(),
  googleMapsUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine(
      (value) => value === undefined || /^https:\/\//i.test(value),
      { message: 'Google Maps URL must start with https://' },
    ),
});

export type ContactBlockProps = z.infer<typeof ContactBlockSchema>;

export function hasContactContent(contact: ContactBlockProps): boolean {
  return Boolean(
    contact.address.trim() ||
      contact.phone.trim() ||
      contact.email.trim() ||
      contact.openingHours.trim() ||
      contact.googleMapsUrl?.trim(),
  );
}

/** site_content.data_json for block_type = AboutBlock */
export const AboutBlockSchema = z.object({
  title: z.string(),
  content: z.string(),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  imagePosition: z.enum(['left', 'right']).default('left'),
});

export type AboutBlockProps = z.infer<typeof AboutBlockSchema>;

export function hasAboutContent(about: AboutBlockProps): boolean {
  return Boolean(about.title.trim() || about.content.trim() || about.imageUrl?.trim());
}

/** site_content.data_json for block_type = FeaturesBlock */
export const FeatureItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  iconOrImageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export const FeaturesBlockSchema = z.object({
  title: z.string(),
  subtitle: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  features: z.array(FeatureItemSchema),
});

export type FeatureItem = z.infer<typeof FeatureItemSchema>;
export type FeaturesBlockProps = z.infer<typeof FeaturesBlockSchema>;

export function hasFeaturesContent(features: FeaturesBlockProps): boolean {
  return Boolean(
    features.title.trim() ||
      features.subtitle?.trim() ||
      features.features.some(
        (item) => item.title.trim() || item.description.trim() || item.iconOrImageUrl?.trim(),
      ),
  );
}
