// URLs do Google Places e de planilhas são dados não confiáveis. Só links HTTP(S)
// absolutos podem virar destinos clicáveis nas telas e demos.
export function safeHttpUrl(value) {
  const raw = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  try {
    const url = new URL(raw);
    if (
      !["http:", "https:"].includes(url.protocol) || !url.hostname ||
      url.username || url.password
    ) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function sanitizeLeadUrls(lead) {
  return {
    ...lead,
    site: safeHttpUrl(lead.site),
    site_demo: safeHttpUrl(lead.site_demo),
    maps_url: safeHttpUrl(lead.maps_url),
    instagram: safeHttpUrl(lead.instagram),
    facebook: safeHttpUrl(lead.facebook),
  };
}
