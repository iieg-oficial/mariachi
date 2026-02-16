#!/bin/sh

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
BACKEND_URL="${BACKEND_URL%/}"

is_number() {
  echo "$1" | grep -Eq '^[0-9]+$'
}

echo "🧪 Iniciando tests de conexión Backend <-> Frontends..."
echo ""

# Test 1: Health
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Test: Health Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
HEALTH="$(curl -s "${BACKEND_URL}/health")"
if printf '%s' "$HEALTH" | grep -Eq '"status": ?"?(ok|healthy)"?'; then
  echo "✅ Backend funcionando"
  echo "   Respuesta: $HEALTH"
else
  echo "❌ Backend no responde"
  echo "   Respuesta: $HEALTH"
  echo ""
  echo "💡 Solución:"
  echo "   cd /IIEG/backend-portal"
  echo "   docker-compose up -d"
  exit 1
fi
echo ""

# Test 2: Login
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Test: Autenticación (Login)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
LOGIN_RESPONSE="$(curl -s -X POST "${BACKEND_URL}/api/administrador/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')"

TOKEN="$(echo "$LOGIN_RESPONSE" | jq -r .access_token 2>/dev/null)"
USERNAME="$(echo "$LOGIN_RESPONSE" | jq -r .user.username 2>/dev/null)"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✅ Login exitoso"
  echo "   Usuario: $USERNAME"
  echo "   Token: $(echo "$TOKEN" | cut -c1-50)..."
else
  echo "❌ Login falló"
  echo "   Respuesta: $LOGIN_RESPONSE"
  echo ""
  echo "💡 Solución:"
  echo "   docker-compose exec backend python scripts/init_db.py"
  exit 1
fi
echo ""

# Test 3: Endpoint Protegido
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Test: Endpoint Protegido (GET /users)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
USERS="$(curl -s -X GET "${BACKEND_URL}/api/administrador/users" \
  -H "Authorization: Bearer $TOKEN")"

USER_COUNT="$(echo "$USERS" | jq 'length' 2>/dev/null)"
if is_number "$USER_COUNT" && [ "$USER_COUNT" -ge 1 ]; then
  echo "✅ Endpoint protegido funciona"
  echo "   Usuarios encontrados: $USER_COUNT"
  echo "   Usuarios: $(echo "$USERS" | jq -r '.[].username' | tr '\n' ', ' | sed 's/,$//')"
else
  echo "❌ Endpoint protegido falló"
  echo "   Respuesta: $USERS"
  exit 1
fi
echo ""

# Test 4: Verificar Token en Header
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Test: Protección de Endpoints (sin token)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
NO_AUTH="$(curl -s -X GET "${BACKEND_URL}/api/administrador/users")"
if printf '%s' "$NO_AUTH" | grep -Eq 'Not authenticated|detail'; then
  echo "✅ Protección funcionando correctamente"
  echo "   Sin token → Acceso denegado"
else
  echo "⚠️  Advertencia: Endpoint no protegido"
  echo "   Respuesta: $NO_AUTH"
fi
echo ""

# Test 5: Endpoint Público
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Test: Endpoint Público (GET /menu-items/tree)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
MENU="$(curl -s "${BACKEND_URL}/api/administrador/menu-items/tree")"
MENU_COUNT="$(echo "$MENU" | jq 'length' 2>/dev/null)"
if is_number "$MENU_COUNT" && [ "$MENU_COUNT" -ge 0 ]; then
  echo "✅ Endpoint público funciona"
  echo "   Items de menú: $MENU_COUNT"
  if [ "$MENU_COUNT" -gt 0 ]; then
    echo "   Menú: $(echo "$MENU" | jq -r '.[].label' | head -3 | tr '\n' ', ' | sed 's/,$//')"
  fi
else
  echo "❌ Endpoint público falló"
  echo "   Respuesta: $MENU"
fi
echo ""

# Test 6: CORS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Test: CORS Headers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CORS_CMS="$(curl -s -I -X OPTIONS "${BACKEND_URL}/api/administrador/menu-items" \
  -H "Origin: http://localhost:3011" \
  -H "Access-Control-Request-Method: GET" | grep -i "access-control-allow-origin")"

CORS_IIEG="$(curl -s -I -X OPTIONS "${BACKEND_URL}/api/administrador/menu-items" \
  -H "Origin: http://localhost:3010" \
  -H "Access-Control-Request-Method: GET" | grep -i "access-control-allow-origin")"

if [ -n "$CORS_CMS" ]; then
  echo "✅ CORS para CMS Portal (3011) configurado"
else
  echo "⚠️  CORS para CMS Portal puede tener problemas"
fi

if [ -n "$CORS_IIEG" ]; then
  echo "✅ CORS para IIEG Portal (3010) configurado"
else
  echo "⚠️  CORS para IIEG Portal puede tener problemas"
fi
echo ""

# Test 7: Verificar Otros Servicios
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Test: Servicios Complementarios"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PG_STATUS="$(docker-compose ps postgres 2>/dev/null | grep -c 'Up')"
if [ "$PG_STATUS" -ge 1 ] 2>/dev/null; then
  echo "✅ PostgreSQL corriendo"
else
  echo "⚠️  PostgreSQL no detectado"
fi

REDIS_STATUS="$(docker-compose ps redis 2>/dev/null | grep -c 'Up')"
if [ "$REDIS_STATUS" -ge 1 ] 2>/dev/null; then
  echo "✅ Redis corriendo"
else
  echo "⚠️  Redis no detectado"
fi

ACERVO_STATUS="$(docker-compose ps acervo 2>/dev/null | grep -c 'Up')"
if [ "$ACERVO_STATUS" -ge 1 ] 2>/dev/null; then
  echo "✅ Acervo corriendo"
else
  echo "⚠️  Acervo no detectado"
fi
echo ""

# Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Todos los tests completados!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

