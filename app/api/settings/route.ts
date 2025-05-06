import { NextResponse } from "next/server"
import { getData, createItem, updateItem } from "@/lib/memory/supabase"
import type { Setting } from "@/types/settings"
import { handleApiError } from "@/lib/api-error-handler"

export async function GET(request: Request) {
  try {
    const settingsArray = await getData<Setting>("settings")

    // Format settings as an object by category
    const settings: Record<string, Record<string, any>> = {}

    for (const setting of settingsArray) {
      if (!settings[setting.category]) {
        settings[setting.category] = {}
      }

      // Parse JSON values if possible
      try {
        settings[setting.category][setting.key] = JSON.parse(setting.value)
      } catch {
        settings[setting.category][setting.key] = setting.value
      }
    }

    return NextResponse.json({
      settings: [settings]
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, settings } = body

    if (!category || !settings) {
      return NextResponse.json({ error: "Category and settings are required" }, { status: 400 })
    }

    // Get existing settings for this category
    const existingSettings = await getData<Setting>("settings", {
      filters: { category },
    })

    // Save each setting
    await Promise.all(
      Object.entries(settings).map(async ([key, value]) => {
        const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value)

        // Format the data to match Supabase schema
        const settingData = {
          category,
          key,
          value: stringValue,
        }

        // Check if setting already exists
        const existingSetting = existingSettings.find((s) => s.key === key)

        if (existingSetting) {
          // Update existing setting
          await updateItem<Setting>("settings", existingSetting.id, settingData)
        } else {
          // Create new setting
          await createItem<Setting>("settings", settingData)
        }
      }),
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
