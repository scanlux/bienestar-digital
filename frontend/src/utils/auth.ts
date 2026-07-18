import Cookies from 'js-cookie';

/**
 * Obtiene el token JWT de autenticación.
 * Busca directamente en js-cookie ('auth_token').
 */
export const getAuthToken = (): string | undefined => {
  return Cookies.get('auth_token');
};

/**
 * Retorna los headers de autorizacion listos para usar con axios.
 */
export const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`
});
