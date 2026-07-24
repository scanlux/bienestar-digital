const db = require('../../../config/db');
const authRepository = require('../auth.repository');
const { logSecurityEvent } = require('../../../utils/securityLogger');

class AuthNavigationService {
  constructor(authService) {
    this.authService = authService;
  }

  async getMyNavigation(user, req) {
    const userId = user.id;
    const actorType = user.actorType;
    const adminType = user.adminType;
    const storeIds = user.storeIds;
    const deliveryCompanyId = user.deliveryCompanyId;

    if (actorType === 'user') {
      const profile = await authRepository.findUserProfile(userId);
      if (profile && profile.cedula && profile.cedula.startsWith('REG_')) {
        await logSecurityEvent(userId, 'NAV_RESTRICTED_INCOMPLETE_PROFILE', 'MEDIUM', req, { email: user.email });
        return [];
      }
    }

    // Determinar scope
    let scope = 'commerce'; // fallback
    if (actorType === 'system_user') {
      scope = 'admin';
    } else if (actorType === 'operator') {
      scope = 'store';
    } else if (actorType === 'user') {
      if (adminType === 'commerce') {
        scope = 'commerce';
      } else if (adminType === 'store') {
        scope = 'store';
      } else if (adminType === 'delivery_company') {
        scope = 'delivery';
      }
    }

    // Obtener los permisos del usuario de forma explícita
    const { permissions: userPermissions } = await authRepository.getUserRolesAndPermissions(actorType, userId);

    // Consulta de navegación
    const [rows] = await db.query(`
      SELECT 
        n.id, n.parent_id, n.label, n.page_title, n.path, n.icon, 
        n.order_index, n.risk_level, n.required_permission,
        COALESCE(p.ui_restriction_mode, 'hidden') AS ui_mode
      FROM system_navigation n
      LEFT JOIN permissions p ON n.required_permission = p.name
      WHERE n.layout_scope = ?
      ORDER BY n.parent_id ASC, n.order_index ASC
    `, [scope]);

    // Filtrar y mapear ítems según permisos
    const resolvedItems = rows.map(row => {
      if (!row.required_permission) {
        return {
          id: row.id,
          parent_id: row.parent_id,
          label: row.label,
          page_title: row.page_title || row.label,
          path: row.path,
          icon: row.icon,
          order_index: row.order_index,
          risk_level: row.risk_level,
          isLocked: false
        };
      }

      const isRoot = actorType === 'system_user' && user.rol === 'root';
      const hasPermission = isRoot || userPermissions.includes(row.required_permission);

      if (!hasPermission && row.ui_mode === 'hidden') {
        return null;
      }

      return {
        id: row.id,
        parent_id: row.parent_id,
        label: row.label,
        page_title: row.page_title || row.label,
        path: row.path,
        icon: row.icon,
        order_index: row.order_index,
        risk_level: row.risk_level,
        isLocked: !hasPermission && row.ui_mode === 'ghost'
      };
    }).filter(Boolean);

    // Resolver parámetros dinámicos (:storeId, :deliveryCompanyId)
    const storeIdVal = storeIds && storeIds.length > 0 ? storeIds[0] : null;
    const resolvedPathItems = resolvedItems.map(item => {
      if (!item.path) return item;
      let p = item.path;
      if (storeIdVal) {
        p = p.replace(':storeId', storeIdVal).replace(':id', storeIdVal);
      }
      if (deliveryCompanyId) {
        p = p.replace(':deliveryCompanyId', deliveryCompanyId);
      }
      return { ...item, path: p };
    });

    // Construir estructura de árbol (grupos y sub-ítems)
    const tree = [];
    const itemMap = {};

    for (const item of resolvedPathItems) {
      item.children = [];
      itemMap[item.id] = item;
      if (!item.parent_id) {
        tree.push(item);
      } else {
        const parent = itemMap[item.parent_id];
        if (parent) {
          parent.children.push(item);
        } else {
          tree.push(item);
        }
      }
    }

    // Ordenar de nuevo los hijos por order_index
    for (const item of tree) {
      if (item.children.length > 0) {
        item.children.sort((a, b) => a.order_index - b.order_index);
      }
    }

    const lockedCount = resolvedPathItems.filter(i => i.isLocked).length;
    await logSecurityEvent(userId, 'NAV_LOADED', 'LOW', req, {
      scope,
      item_count: resolvedPathItems.length,
      locked_count: lockedCount
    }, 'system', null);

    return tree;
  }
}

module.exports = AuthNavigationService;
