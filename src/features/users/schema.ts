import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اسم الدور قصير جداً")
    .max(40, "اسم الدور طويل جداً")
    .regex(/^[A-Z0-9_]+$/, "اسم الدور يجب أن يكون أحرفاً لاتينية كبيرة مع أرقام وشرطات سفلية"),
  description: z.string().trim().max(160, "الوصف طويل جداً").optional().or(z.literal("")),
});

export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;

export const roleAssignSchema = z.object({
  roleId: z
    .string()
    .min(1, "اختر دوراً"),
});

export type RoleAssignFormValues = z.infer<typeof roleAssignSchema>;
