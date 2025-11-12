import { UISettingsModel } from "../models/UISettings.js";

export const getUISettings = async (req, res) => {
  try {
    const { tenantId } = req.params;

    let settings = await UISettingsModel.findOne({ orgId: tenantId });

    // If no settings exist, create default ones
    if (!settings) {
      settings = new UISettingsModel({
        orgId: tenantId,
        primaryColor: "#6366f1",
        secondaryColor: "#8b5cf6",
        accentColor: "#ec4899",
        fontFamily: "Inter, sans-serif",
        theme: "dark",
        cardStyle: "glassmorphism",
        showAnalytics: true,
        showRecentFiles: true,
        fileViewLayout: "large-icons",
      });
      await settings.save();
    }

    res.json({
      success: true,
      settings: {
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        fontFamily: settings.fontFamily,
        theme: settings.theme,
        cardStyle: settings.cardStyle,
        showAnalytics: settings.showAnalytics,
        showRecentFiles: settings.showRecentFiles,
        fileViewLayout: settings.fileViewLayout,
        logoUrl: settings.logoUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateUISettings = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: "Settings object is required" });
    }

    // Find and update or create new
    let uiSettings = await UISettingsModel.findOne({ orgId: tenantId });

    if (!uiSettings) {
      uiSettings = new UISettingsModel({ orgId: tenantId });
    }

    // Update fields
    if (settings.primaryColor) uiSettings.primaryColor = settings.primaryColor;
    if (settings.secondaryColor)
      uiSettings.secondaryColor = settings.secondaryColor;
    if (settings.accentColor) uiSettings.accentColor = settings.accentColor;
    if (settings.fontFamily) uiSettings.fontFamily = settings.fontFamily;
    if (settings.theme) uiSettings.theme = settings.theme;
    if (settings.cardStyle) uiSettings.cardStyle = settings.cardStyle;
    if (settings.logoUrl !== undefined) uiSettings.logoUrl = settings.logoUrl;
    if (settings.showAnalytics !== undefined)
      uiSettings.showAnalytics = settings.showAnalytics;
    if (settings.showRecentFiles !== undefined)
      uiSettings.showRecentFiles = settings.showRecentFiles;
    if (settings.fileViewLayout)
      uiSettings.fileViewLayout = settings.fileViewLayout;

    await uiSettings.save();

    res.json({
      success: true,
      message: "UI settings updated successfully",
      settings: {
        primaryColor: uiSettings.primaryColor,
        secondaryColor: uiSettings.secondaryColor,
        accentColor: uiSettings.accentColor,
        fontFamily: uiSettings.fontFamily,
        theme: uiSettings.theme,
        cardStyle: uiSettings.cardStyle,
        showAnalytics: uiSettings.showAnalytics,
        showRecentFiles: uiSettings.showRecentFiles,
        fileViewLayout: uiSettings.fileViewLayout,
        logoUrl: uiSettings.logoUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
