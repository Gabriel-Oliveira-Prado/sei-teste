# Sistema de Monitoramento de Bueiros

## Visão Geral

O Sistema de Monitoramento de Bueiros é uma solução completa para monitoramento em tempo real de sistemas de esgoto urbano, utilizando sensores IoT para detectar níveis de água e gases tóxicos, prevenindo alagamentos e riscos à saúde pública.

## Arquitetura do Sistema

![Fluxograma do Sistema](system_flowchart.png)

### Componentes Principais

#### 1. Sensores IoT
- **Sensores de Nível de Água**: Monitoram o nível de água nos bueiros
- **Sensores de Gases Tóxicos**: Detectam gases perigosos (CO, H2S, CH4)
- **Sensores Combinados**: Monitoram múltiplos parâmetros simultaneamente

#### 2. Backend (Node.js + Express)
- **Servidor Principal**: Porta 3001
- **APIs REST**: Endpoints para sensores, alertas, dashboard e relatórios
- **WebSocket**: Comunicação em tempo real
- **Sistema de Autenticação**: JWT para segurança
- **Serviços de Processamento**: Análise de dados e geração de alertas

#### 3. Banco de Dados (MySQL)
- **sensors**: Cadastro e configuração dos sensores
- **sensor_readings**: Histórico de leituras dos sensores
- **alerts**: Registro de alertas gerados
- **users**: Usuários do sistema

#### 4. Frontend Web (React)
- **Dashboard Interativo**: Visualização em tempo real
- **Mapa de Sensores**: Localização e status dos sensores
- **Sistema de Alertas**: Gerenciamento de notificações
- **Relatórios**: Análises e estatísticas
- **Gráficos Dinâmicos**: Visualização de dados históricos

#### 5. Aplicativo Mobile (React Native)
- **Interface Responsiva**: Adaptada para dispositivos móveis
- **Notificações Push**: Alertas em tempo real
- **Acesso Offline**: Funcionalidades básicas sem internet
- **Geolocalização**: Navegação até sensores

#### 6. Sistema de Notificações
- **WhatsApp API**: Alertas críticos via WhatsApp
- **Email**: Relatórios periódicos
- **Push Notifications**: Notificações mobile

## Funcionalidades

### Monitoramento em Tempo Real
- Coleta contínua de dados dos sensores
- Processamento automático de alertas
- Visualização instantânea no dashboard
- Atualizações via WebSocket

### Sistema de Alertas Inteligente
- **Níveis de Severidade**: Low, Medium, High, Critical
- **Tipos de Alerta**: Risco de alagamento, gases tóxicos, manutenção, sensor offline
- **Notificações Automáticas**: WhatsApp, email e push notifications
- **Escalação de Alertas**: Baseada na severidade e tempo de resposta

### Dashboard Analítico
- **Visão Geral**: Estatísticas gerais do sistema
- **Mapa Interativo**: Localização e status dos sensores
- **Gráficos Dinâmicos**: Tendências e análises históricas
- **Alertas Recentes**: Lista de alertas ativos e resolvidos

### Relatórios Avançados
- **Relatório de Sensores**: Performance e status dos dispositivos
- **Relatório de Alertas**: Análise de incidentes
- **Relatório de Performance**: Métricas do sistema
- **Relatório Resumo**: Visão executiva

## Tecnologias Utilizadas

### Backend
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **MySQL**: Banco de dados relacional
- **Socket.io**: WebSocket para tempo real
- **JWT**: Autenticação e autorização
- **bcryptjs**: Criptografia de senhas

### Frontend Web
- **React**: Biblioteca de interface
- **Tailwind CSS**: Framework de estilos
- **Leaflet**: Mapas interativos
- **Recharts**: Gráficos e visualizações
- **Axios**: Cliente HTTP

### Mobile
- **React Native**: Framework mobile
- **Expo**: Plataforma de desenvolvimento
- **React Navigation**: Navegação entre telas
- **AsyncStorage**: Armazenamento local

### DevOps e Infraestrutura
- **Docker**: Containerização (opcional)
- **PM2**: Gerenciamento de processos
- **Nginx**: Proxy reverso (produção)
- **SSL/TLS**: Certificados de segurança

## Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configurar variáveis de ambiente
npm run dev
```

### Frontend Web
```bash
cd frontend
npm install
npm run dev
```

### Mobile
```bash
cd mobile
npm install
npm run web  # Para testar no navegador
npm run android  # Para Android
npm run ios  # Para iOS
```

### Banco de Dados
```bash
mysql -u root -p < database_schema.sql
```

## Configuração de Ambiente

### Variáveis de Ambiente (.env)
```env
# Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=sewer_user
DB_PASSWORD=sewer_pass123
DB_NAME=sewer_monitoring

# Servidor
PORT=3001
JWT_SECRET=your_jwt_secret_key

# WhatsApp API (opcional)
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_TOKEN=your_whatsapp_token

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## API Endpoints

### Autenticação
- `POST /api/auth/login` - Login do usuário
- `GET /api/auth/profile` - Perfil do usuário
- `POST /api/auth/logout` - Logout

### Sensores
- `GET /api/sensors` - Lista todos os sensores
- `GET /api/sensors/:id` - Detalhes de um sensor
- `GET /api/sensors/:id/readings` - Leituras de um sensor

### Alertas
- `GET /api/alerts` - Lista alertas
- `GET /api/alerts/:id` - Detalhes de um alerta
- `PUT /api/alerts/:id/acknowledge` - Reconhecer alerta
- `PUT /api/alerts/:id/resolve` - Resolver alerta

### Dashboard
- `GET /api/dashboard/overview` - Visão geral
- `GET /api/dashboard/map-data` - Dados do mapa
- `GET /api/dashboard/recent-alerts` - Alertas recentes
- `GET /api/dashboard/charts/readings-timeline` - Dados dos gráficos

### Relatórios
- `GET /api/reports/sensors` - Relatório de sensores
- `GET /api/reports/alerts` - Relatório de alertas
- `GET /api/reports/performance` - Relatório de performance
- `GET /api/reports/summary` - Relatório resumo

## Segurança

### Autenticação e Autorização
- JWT tokens para autenticação
- Middleware de autorização em todas as rotas protegidas
- Senhas criptografadas com bcrypt
- Sessões com expiração automática

### Proteção de Dados
- Validação de entrada em todos os endpoints
- Sanitização de dados do banco
- Headers de segurança (CORS, CSP)
- Rate limiting para prevenir ataques

### Comunicação Segura
- HTTPS em produção
- Certificados SSL/TLS
- Criptografia de dados sensíveis
- Logs de auditoria

## Monitoramento e Logs

### Logs do Sistema
- Logs estruturados em JSON
- Níveis: error, warn, info, debug
- Rotação automática de logs
- Integração com ferramentas de monitoramento

### Métricas de Performance
- Tempo de resposta das APIs
- Uso de CPU e memória
- Conexões de banco de dados
- Uptime do sistema

### Alertas de Sistema
- Falhas de conectividade
- Erros críticos
- Performance degradada
- Sensores offline

## Manutenção

### Backup
- Backup automático do banco de dados
- Backup de configurações
- Versionamento de código
- Plano de recuperação de desastres

### Atualizações
- Versionamento semântico
- Testes automatizados
- Deploy com zero downtime
- Rollback automático em caso de falha

### Monitoramento de Sensores
- Health check automático
- Calibração periódica
- Substituição preventiva
- Manutenção preditiva

## Suporte e Documentação

### Documentação Técnica
- API documentation (Swagger/OpenAPI)
- Diagramas de arquitetura
- Guias de instalação
- Troubleshooting

### Suporte ao Usuário
- Manual do usuário
- Vídeos tutoriais
- FAQ
- Canal de suporte técnico

## Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Contato

Para dúvidas, sugestões ou suporte técnico, entre em contato através dos canais oficiais do projeto.

---

**Sistema de Monitoramento de Bueiros** - Desenvolvido para prevenir alagamentos e proteger a saúde pública através de tecnologia IoT avançada.

