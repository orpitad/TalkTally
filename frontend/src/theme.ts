export const colors = {
  surface: "#FDFBF7",
  surface2: "#FFFFFF",
  surface3: "#F3EFE6",
  onSurface: "#2A2A2E",
  onSurfaceMuted: "#6B6A6F",
  brand: "#FF8A65",
  onBrand: "#FFFFFF",
  brandSoft: "#FFE0B2",
  onBrandSoft: "#D84315",
  brand2: "#64B5F6",
  brand2Soft: "#E1F1FF",
  success: "#81C784",
  onSuccess: "#FFFFFF",
  successSoft: "#DFF3E0",
  warning: "#FFD54F",
  onWarning: "#5C4000",
  error: "#E57373",
  onError: "#FFFFFF",
  info: "#4FC3F7",
  border: "#EAE6DF",
  borderStrong: "#D1CCC2",
  divider: "#F3EFE6",
  mint: "#B2DFDB",
  charcoal: "#2A2A2E",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 16, lg: 24, pill: 999 };

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
};

export const font = {
  display: undefined as string | undefined, // system bold fallback
  text: undefined as string | undefined,
};
