# Этап сборки
FROM node:24-alpine AS build

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json package-lock.json ./
RUN npm install
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm install -g @angular/cli
RUN npm run build:prod


# Этап запуска
FROM nginx:alpine

# Копируем nginx конфигурацию
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Копируем собранное приложение
COPY --from=build /app/dist/frontend-app /usr/share/nginx/html

# Открываем порт
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
