import Cookies from 'js-cookie';

/**
 * Obtiene el token JWT de autenticacion.
 * Busca primero en js-cookie ('token'), luego en document.cookie ('auth_token').
 */
export const getAuthToken = (): string | undefined => {
  return Cookies.get('token') 
    || document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
};

/**
 * Retorna los headers de autorizacion listos para usar con axios.
 */
export const getAuthHeaders = () => ({
  Authorization: `Bearer ${getAuthToken()}`
});
