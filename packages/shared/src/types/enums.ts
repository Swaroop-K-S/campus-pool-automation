import { z } from 'zod';

export const RoleEnum = z.enum(["platform_admin", "college_admin", "company_hr", "invigilator"]);
export type Role = z.infer<typeof RoleEnum>;

export const RoundTypeEnum = z.enum(["ppt", "aptitude", "coding", "gd", "technical_interview", "hr_interview"]);
export type RoundType = z.infer<typeof RoundTypeEnum>;

export const DriveStatusEnum = z.enum(["draft", "active", "event_day", "completed"]);
export type DriveStatus = z.infer<typeof DriveStatusEnum>;

export const RoundStatusEnum = z.enum(["pending", "active", "completed"]);
export type RoundStatus = z.infer<typeof RoundStatusEnum>;

export const ApplicationStatusEnum = z.enum(["applied", "shortlisted", "invited", "attended", "round_N_passed", "round_N_failed", "selected", "rejected"]);
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

export const NotificationRecipientTypeEnum = z.enum(["all_shortlisted", "individual"]);
export type NotificationRecipientType = z.infer<typeof NotificationRecipientTypeEnum>;

export const NotificationChannelEnum = z.enum(["email", "whatsapp", "push"]);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;

export const NotificationStatusEnum = z.enum(["sent", "failed"]);
export type NotificationStatus = z.infer<typeof NotificationStatusEnum>;

export const FormFieldTypeEnum = z.enum(["text", "textarea", "number", "email", "phone", "dropdown", "radio", "checkbox", "date", "file_pdf", "file_image"]);
export type FormFieldType = z.infer<typeof FormFieldTypeEnum>;
