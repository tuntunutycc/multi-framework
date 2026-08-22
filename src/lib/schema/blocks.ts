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
