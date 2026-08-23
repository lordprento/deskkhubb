"use server";

import { revalidatePath } from "next/cache";
import cron from "node-cron";
import { prisma } from "@/lib/db";
import { DEFAULT_CRON_EXPRESSION } from "@/lib/automation";

const CONFIG_ID = "default";

export async function setAutomationEnabled(enabled: boolean) {
  await prisma.automationConfig.upsert({
    where: { id: CONFIG_ID },
    update: { enabled },
    create: {
      id: CONFIG_ID,
      enabled,
      cronExpression: DEFAULT_CRON_EXPRESSION,
    },
  });
  revalidatePath("/settings/automation");
  return { ok: true as const, enabled };
}

export async function updateAutomationSchedule(input: {
  cronExpression: string;
  notifyEmail: string;
}) {
  const cronExpression = input.cronExpression.trim();
  if (!cron.validate(cronExpression)) {
    return {
      ok: false as const,
      error: `"${cronExpression}" is not a valid cron expression`,
    };
  }

  const notifyEmail = input.notifyEmail.trim();
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    return { ok: false as const, error: "Enter a valid email address" };
  }

  await prisma.automationConfig.upsert({
    where: { id: CONFIG_ID },
    update: { cronExpression, notifyEmail: notifyEmail || null },
    create: {
      id: CONFIG_ID,
      enabled: false,
      cronExpression,
      notifyEmail: notifyEmail || null,
    },
  });
  revalidatePath("/settings/automation");
  return { ok: true as const };
}
