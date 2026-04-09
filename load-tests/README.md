# Teste de Carga — Fluxnote


## Pré-requisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado (`choco install k6`)
- InfluxDB 1.8 instalado e a correr na porta 8086
- Grafana instalado e a correr na porta 3000
- Backend Fluxnote a correr em `http://localhost:7041`

---

## Execução Passo a Passo

### 1. Iniciar o backend

```powershell
cd fluxnote-backend
dotnet run --configuration Release
```

### 2. Iniciar InfluxDB e Grafana

Abre **dois terminais separados** e corre um em cada:

```powershell
# Terminal A InfluxDB
influxd
```

```powershell
# Terminal B Grafana
cd "C:\ProgramData\chocolatey\lib\grafana\tools\grafana-12.4.2"
.\bin\grafana-server.exe
```

Cria a base de dados k6 no InfluxDB (só é necessário fazer uma vez):

```powershell

# Abre o CLI do InfluxDB
influx
> CREATE DATABASE k6
> EXIT
```

### 3. Configurar Grafana (só uma vez)

1. Abre http://localhost:3000 — login: `admin / admin`
2. **Connections → Add new data source → InfluxDB**
   - **Name:** `k6`
   - **URL:** `http://localhost:8086`
   - **Database:** `k6`
   - **HTTP Method:** `GET`
   - Clica em **Save & Test** — deve aparecer "datasource is working"
3. **Dashboards → Import → Upload JSON file**
   - Seleciona o ficheiro `dashboard-k6.json` (na pasta `load-tests`)
   - **Import**

### 4. Pré-criar os 150 utilizadores de teste

```powershell
cd load-tests
k6 run setup-users.js
```

### 5. Correr o teste de carga

```powershell
cd load-tests
k6 run --out influxdb=http://localhost:8086/k6 load-test.js
```

Acompanha em tempo real no Grafana: http://localhost:3000

Para guardar também em JSON (para relatório):

```powershell
k6 run --out influxdb=http://localhost:8086/k6 --out json=results.json load-test.js
```
