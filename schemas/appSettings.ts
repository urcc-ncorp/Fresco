import { z } from 'zod';

export const appSettingsSchema = z
  .object({
    initializedAt: z.date(),
    configured: z.boolean(),
    allowAnonymousRecruitment: z.boolean(),
    limitInterviews: z.boolean(),
    installationId: z.string(),
    disableAnalytics: z.boolean(),
    disableSmallScreenOverlay: z.boolean(),
  })
  .strict();

export type AppSetting = keyof z.infer<typeof appSettingsSchema>;

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

// Variation of the schema that converts the string types in the db to the correct types
export const appSettingPreprocessedSchema = appSettingsSchema.extend({
  initializedAt: z.coerce.date(),
  configured: z.preprocess(parseBoolean, z.boolean().default(false)),
  allowAnonymousRecruitment: z.preprocess(
    parseBoolean,
    z.boolean().default(false),
  ),
  limitInterviews: z.preprocess(parseBoolean, z.boolean().default(false)),
  disableAnalytics: z.preprocess(parseBoolean, z.boolean().default(false)),
  disableSmallScreenOverlay: z.preprocess(
    parseBoolean,
    z.boolean().default(false),
  ),
  installationId: z.string().optional(),
});
