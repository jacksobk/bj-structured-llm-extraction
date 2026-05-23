# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /code
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /code
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /code/dist ./dist
ENV APP_ENVIRONMENT=PROD
EXPOSE 8210
CMD ["node", "dist/main.js"]
