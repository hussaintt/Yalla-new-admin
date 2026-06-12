import { z } from "zod";

export const bannerSchema = z.object({
  title: z.string().trim().min(1, "العنوان باللغة العربية مطلوب"),
  description: z.string().trim().optional().or(z.literal("")),
  position: z.enum(["HOME_HERO", "HOME_STRIP", "CATEGORY_HEADER", "CATEGORIES_FEATURED"], {
    message: "الموضع مطلوب",
  }),
  linkTarget: z.string().trim().optional().or(z.literal("")),
  imageFileId: z.string().min(1, "صورة البانر مطلوبة"),
  isActive: z.string(),
});

export type BannerFormValues = z.infer<typeof bannerSchema>;
