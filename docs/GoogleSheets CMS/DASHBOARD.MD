# Dashboard Builder

The Dashboard Builder provides a framework for defining, storing, and rendering dashboards using Google Sheets' native table features.

---

## Architecture

```
DashboardBuilderService
    │
    ├── getDefinitions() → { dashboards: [...], source: "dashboard-builder-registry" }
    │
    ├── refreshNativeDashboard() → (placeholder for native Sheets dashboard refresh)
    │
    └── registry: DashboardBuilderRegistry
          ├── getDashboards() → dashboards[]
          ├── setDashboards(dashboards)
          ├── getLayout(name) → layout object
          └── setLayout(name, layout)
                │
                ▼
          PropertiesAccessor (Script Properties)
          Key: APP_DASHBOARD.KEY
```

---

## DashboardBuilderRegistry

Stores dashboard definitions and layouts in **Script Properties** as a JSON object.

### Data Structure

```javascript
// Stored under APP_DASHBOARD.KEY in Properties
{
  "dashboards": [
    {
      "name": "Sales Overview",
      "type": "table",
      "sheetName": "Sales",
      "columns": ["Product", "Revenue", "Region"],
      "filters": { "Region": "Asia" }
    },
    {
      "name": "User Stats",
      "type": "chart",
      "sheetName": "Users",
      "chartType": "PIE",
      "column": "Country"
    }
  ],
  "layouts": {
    "default": {
      "columns": 2,
      "items": [
        { "dashboard": "Sales Overview", "width": 8 },
        { "dashboard": "User Stats", "width": 8 }
      ]
    }
  }
}
```

### API

```javascript
const registry = new DashboardBuilderRegistry(modules);

// Dashboards
registry.getDashboards();           // → [...]
registry.setDashboards([...]);      // → boolean

// Layouts
registry.getLayout("default");      // → { columns: 2, items: [...] }
registry.setLayout("default", {...});  // → boolean
```

---

## DashboardBuilderService

The service layer orchestrates the registry and provides discovery integration.

### `getDefinitions()`

Called by `DiscoveryService.discover()` to return all registered dashboards:

```javascript
DiscoveryService.discover()
    → getDashboardDefinitions()
        → DashboardBuilderService.getDefinitions()
            → registry.getDashboards()

// Returns:
{
    dashboards: [...],
    source: "dashboard-builder-registry"
}
```

### `refreshNativeDashboard()`

Placeholder for triggering a native Google Sheets dashboard refresh:

```javascript
// Current implementation (placeholder):
refreshNativeDashboard() {
    Logger.log("[DashboardBuilderService] refreshNativeDashboard placeholder executed.");
    return {
        success: true,
        message: "Dashboard refresh placeholder executed.",
        definitions: this.getDefinitions(),
    };
}
```

---

## Integration with DiscoveryService

When the client calls `google.script.run.loadData()`, the `DiscoveryService` includes dashboard definitions:

```javascript
// Client receives:
{
    headers: { ... },
    namedRanges: { ... },
    dashboardDefinitions: {
        dashboards: [...],
        source: "dashboard-builder-registry"
    }
}
```

---

## Menu Trigger

The menu includes a native dashboard option:

```
📂 Google Sheets CMS → 📊 Native Dashboard
```

This triggers `MenuTriggers.NativeDashboard()` → `DashboardBuilderService.refreshNativeDashboard()`.

---

## Persistence

All dashboard data is stored in **Document Properties** (scoped to the spreadsheet). This means:

- Dashboard definitions survive script redeployments
- Each spreadsheet instance has its own dashboard configuration
- No external database required

---

## Future Extensions

The architecture supports:

- **Chart dashboards** — bar, line, pie charts from sheet data
- **Custom layouts** — multi-column, tabbed, or split-pane
- **Scheduled refresh** — time-driven triggers for auto-updating dashboards
- **Conditional formatting** — color-coded cells based on data ranges

---

## Next

- [Server Architecture](./SERVER.MD) — full service layer overview
- [Settings Reference](./SETTINGS_REFERENCE.MD) — related settings
