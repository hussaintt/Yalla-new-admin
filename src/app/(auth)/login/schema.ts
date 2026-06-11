import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "اسم المستخدم أو البريد مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
