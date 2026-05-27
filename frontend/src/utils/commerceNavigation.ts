export const COMMERCE_HIGHLIGHT_PARAM = 'highlight';

export function getCommerceReturnUrl(commerceId?: number | string | null): string {
  const base = '/admin/dashboard/commerce';
  if (commerceId != null && commerceId !== '') {
    return `${base}?${COMMERCE_HIGHLIGHT_PARAM}=${commerceId}`;
  }
  return base;
}
