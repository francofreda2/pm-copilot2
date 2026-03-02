# PM Copilot

PM Copilot es un asistente basado en Inteligencia Artificial (LLM) diseñado para transformar descripciones breves de proyectos en artefactos estructurados de Project Management.

## Objetivo del Producto
El usuario ingresa una descripción simple de un proyecto y la aplicación devuelve automáticamente:
- Resumen ejecutivo
- Objetivo general y específicos
- Alcance (incluye / excluye)
- Supuestos y restricciones
- EDT/WBS en formato árbol ASCII y tabla
- Entregables principales
- Hitos
- Riesgos y mitigaciones
- KPIs sugeridos
- Pendientes de validación

## Stack Tecnológico
- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React (Iconos).
- **Backend:** Node.js, Express.
- **Base de Datos:** SQLite (better-sqlite3) para el historial local.
- **IA:** Google Gemini API (`@google/genai`).

## Requisitos Previos
Para ejecutar este proyecto, necesitas:
1. Node.js (v18 o superior).
2. Una API Key válida de Google Gemini.

## Instalación y Configuración

1. **Clonar el repositorio y entrar al directorio:**
   \`\`\`bash
   git clone <url-del-repo>
   cd pm-copilot
   \`\`\`

2. **Instalar dependencias:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurar Variables de Entorno:**
   Copia el archivo de ejemplo y crea tu propio `.env`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Abre el archivo `.env` y añade tu API Key de Gemini:
   \`\`\`env
   GEMINI_API_KEY="TU_API_KEY_AQUI"
   \`\`\`

4. **Iniciar el Servidor de Desarrollo:**
   \`\`\`bash
   npm run dev
   \`\`\`
   La aplicación estará disponible en \`http://localhost:3000\`.

## Uso
1. Abre la aplicación en tu navegador.
2. Completa el formulario con los detalles de tu proyecto (Descripción, Tipo, Objetivo, Área, Sistemas).
3. Haz clic en "Generar Propuesta".
4. Revisa los artefactos generados.
5. Usa el botón "Exportar .md" para descargar la propuesta en formato Markdown.
6. Accede a proyectos anteriores desde la barra lateral izquierda.

## Estructura del Proyecto
- \`/src/components\`: Componentes de React (UI).
- \`/src/types\`: Interfaces TypeScript compartidas.
- \`/db\`: Archivos de la base de datos SQLite.
- \`/server.ts\`: Backend Express y endpoints de la API.
