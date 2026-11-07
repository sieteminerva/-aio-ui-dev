## 📄 Google Sheets CMS

##### `Built by AIO Technology`
---
Google Sheets CMS is a no-code `Content Management System` powered entirely by `Google Workspace` products:
- ✅ `Google Sheets` → as your `database`.
- ✅ `Google Drive` → as your media `storage`.
- ✅ `Google Apps Script` → `Form builder` + auto-generated `REST API`.
- ✅ (Optional) Auto `Translation` using `Google Translate` API (TranslateApp)

With this system, you only need to create a `table` inside Google Sheets, and the system will automatically:

- Generate input forms (UI inside Sheets)
- Manage file uploads (Google Drive)
- Support i18n with automatic translation
- Generate REST API endpoints for your frontend

A perfect solution for `rapid prototyping`, `landing pages`, `simple CMS`, and front-end teams needing a quick backend without building servers.

---

## ✨ Features

| Feature                      | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| 🟢 No-code CMS               | Create Sheets → System generates Forms + API automatically          |
| 📄 Built-in Form Builder     | Input types based on header config (`text`, `select`, `file`, etc.) |
| 🌐 Auto Translation (i18n)   | Select default/target language, translate Sheets automatically      |
| 🔗 REST API                  | Supports `GET`, `POST`, `UPDATE`, `DELETE`                          |
| 📁 File Upload Support       | Upload files to Google Drive automatically                          |
| 🧩 Select / Dropdown options | Controlled via named ranges                                         |
| 🚀 Fast Mockup               | Great for prototyping, internal tools, landing pages                |

---
# Getting Started

Follow these steps to install and initialize Google Sheets CMS in less than 3 minutes.

## SETUP

#### ✅ 1. Copy the template (required)

Click this link to create your own copy of the CMS spreadsheet:

> 👉 https://docs.google.com/spreadsheets/d/FILE_ID/copy

This will place the `spreadsheet + Apps Script files` into your `Google Drive` automatically.

#### ✅ 2. Open the custom menu

When the Sheet finishes loading, you will see a new menu in the toolbar:

> 📂 My Menu (default)

Click:

> 📂 My Menu → ⚠️ SETUP REQUIRED → Click to Configure

#### ✅ 3. Run the first-time setup

The setup does this:

- Store the default system settings (as script properties)
- Auto-generate a Google Drive folder for uploads
- save:
  - scriptId
  - spreadsheetId
  - driveFolderId
- Create a sheet named vars
- create mandatory named ranges: (in the `vars` sheet)

  | Named Range      | Purpose                                      |
  | ---------------- | -------------------------------------------- |
  | `ExcludeSheets`  | Sheets that should be ignored by the CMS     |
  | `ExcludeHeaders` | Columns that should not be included in forms |

- When setup starts, you will see a confirmation dialog:
  This script will set the default settings for initial setup. Click 'OK' to continue.
  > Click OK ✅
- After setup completes, a Settings modal will open automatically.

#### ✅ 4. Configure project settings (optional)

Inside the Settings modal, you can configure:

| Setting              | Description                                  |
| -------------------- | -------------------------------------------- |
| Auto-Translation     | Enable/Disable content translation           |
| Default Language     | Base language of your content                |
| Target Language      | Translated version of your content           |
| Translatable Columns | Pick which columns should be auto-translated |
| File uploads         | Max file size & number of attachments        |
| Menu title           | Customize the menu name                      |
| Debug mode           | Show logs inside Apps Script Execution Log   |

##### 🧠 How auto-translation works (summary):

> It Uses Apps Script TranslateApp API. When enabled, the CMS will copy the current sheet into a new sheet, translate selected headers, and keep it synced

## 🧩 Usage

Once setup is done, using the CMS is simple.

1. ➕ Add a new `Sheet`
2. ➕ Create new `Table`
   > After creating your table add `Headers` in the `first row`.
3. Go to:
   > 📂 My Menu → 📑 Forms → 🔄 Refresh

The system will generate:

- An Input Form (for creating records)
- Automatic REST API endpoints for that sheet `GET, POST, UPDATE, DELETE`.
  in order to works your apps must be deployed. [how to deploy](#-deployment)

### ✏️ Configure form fields

> You have two ways to customize the input form:

| Method                     | Where                                                                                          | Suitable for  |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ------------- |
| Add JSON into header note. | In Google Sheets header cell (right click → "Note"). [detailed here](#json-input-configuration) | Power users   |
| GUI Input Builder          | **📂 My Menu → 📑 Forms → 🛠️ Input Configuration**                                             | No-code users |

> By default, the system will generate every header as <input type="text"> field.

### 📝 Submitting data

To submit data:
Go to:

> 📂 My Menu → 📑 Forms → 📝 Input Data

Pick a sheet (from clicking on sheet selector) → Fill the form → Submit ✅

| Feature                                | Automatic? |
| -------------------------------------- | ---------- |
| Generate REST API                      | ✅         |
| Generate Input Form                    | ✅         |
| Validation (required, file size, etc.) | ✅         |
| Auto translation (if enabled)          | ✅         |
| Convert headers → JSON API fields      | ✅         |

---
## 📡 REST API Endpoints

## Google Sheets CMS automatically exposes your sheet as a REST JSON API.

### GET

🔓 Public Access API (No authentication)
Fetch sheet data using the sheet name as query parameter:
**GET Endpoint**
> https://script.google.com/macros/s/{deploymentId}/exec?sheet={sheetName}&lang={lang}&sortBy={property}&category={property}&order={asc|desc}&page={1}&limit={number}

🔐 Protected API (Requires Authentication)
Fetch data using the sheet name in the URL path, only available if you enable OAuth:
**GET Endpoint requires Auth** 
> https://script.google.com/macros/s/{deploymentId}/api/{sheetName}?lang={lang}&sortBy={property}&category={property}&order={asc|desc}&page={1}&limit={number}


**🔍 Query Parameters**:
> Both URLs support the same query parameters (pagination, filtering, search, etc.)


| Param            | Type   | Description                                   |
| ---------------- | ------ | --------------------------------------------- |
| `action`         | string | Required for **`POST`**: `"create"`, `"update"`, `"delete"`|
| `sheet` (public) | string | Sheet name (only required on public endpoint) |
| `uuid`           | string | Get a specific record                         |
| `lang`           | string | Translated sheet to read (`id`, `en`, etc.)   |
| `search`         | string | Search across all text fields                 |
| `sortBy`         | string | Sort by column/header name                    |
| `order`          | string | `asc` (default) or `desc`                     |
| `page`           | number | Page number (default `1`)                     |
| `limit`          | number | Rows per page (default `10`)                  |

**`GET` Response**:

```json
{
  "data": [
    {
      // Record 1 example
      "timestamp": "26/10/2023 10:00:00",
      "emailAddress": "user@example.com",
      "uuid": "some-uuid-123",
      "title": "Translated Project Title",
      "caption": "Translated project description.",
      "specification": "Translated specs",
      "date": "26/10/2023",
      "client": "Client A",
      "files": "https://drive.usercontent.com/download?id=file-id-1",
      "url": "http://example.com/project1",
      "price": 1000
    },
    {
      // Record 2
    }
  ],
  "meta": {
    "totalItems": 20,
    "itemsPerPage": 5,
    "currentPage": 2,
    "totalPages": 4,
    "links": {
      "self": "?action=get&lang=en&search=project&sortBy=date&order=desc&page=2&limit=5",
      "next": "?action=get&lang=en&search=project&sortBy=date&order=desc&page=3&limit=5",
      "prev": "?action=get&lang=en&search=project&sortBy=date&order=desc&page=1&limit=5",
      "first": "?action=get&lang=en&search=project&sortBy=date&order=desc&page=1&limit=5",
      "last": "?action=get&lang=en&search=project&sortBy=date&order=desc&page=4&limit=5"
    }
  },
  "success": true,
  "message": "Data retrieved successfully."
}
```

### POST

**POST Endpoint:** 
> https://script.google.com/macros/s/{deploymentId}/api/{sheetName})

All write operations `Create, Update, and Delete` use POST (doPost() in Apps Script). we differentiate the request with their payloads.

**CREATE** (Insert New Row)
The system will auto generating `uuid` and `timestamp` for every request

```js
// Create new record Request Example
{
  action: "create",
  formData: {
    "title": "Buy Supplies",
    "category": "Expense",
    "client": "Client X",
    "price": 2000
  }
}
```

**UPDATE** (Modify Existing Row Value)
The system will find the records to update the records `uuid`.

```js
// Update record Request Example
{
  action: "update",
  updates: {
    uuid: "uuid-for-the-record",
    "price": 4000
  }
}
```

**DELETE** (Remove Row)
The system will find the records to delete also by the records `uuid`.

```js
// Delete record Request Example
{
  action: "delete",
  uuid: "uuid-for-the-record",
}
```

### **`POST` Response**:

  ```json
  {
    "success": true,
    "message": "Row with UUID 'the-uuid-of-the-row-to-update' updated successfully."
  }
  ```

### Usage Examples
---
##### GET JavaScript Fetch
```js
// GET records
fetch("https://script.google.com/macros/s/{deploymentId}/exec?action=get&sheet=Sheet1")
  .then((res) => res.json())
  .then((res) => console.log(res.data));
```
##### POST (Create) JavaScript Fetch
```js
// POST (Create) new record
fetch("https://script.google.com/macros/s/{deploymentId}/api/Sheet1", {
  method: "POST",
  body: JSON.stringify({
    action: "create",
    formData: {
      title: "New Project",
      price: 2000,
    },
  }),
});
```
##### POST (Update) JavaScript Fetch
```js

// POST (Update) record
fetch("https://script.google.com/macros/s/{deploymentId}/api/Sheet1", {
  method: "POST",
  body: JSON.stringify({
    action: "create",
    updates: {
      uuid: "uuid-for-the-record-to-update",
      title: "New Project (Update)",
      price: 4000,
    },
  }),
});
```
##### POST (Delete) JavaScript Fetch
```js
// POST (Delete) record
fetch("https://script.google.com/macros/s/{deploymentId}/api/Sheet1", {
  method: "POST",
  body: JSON.stringify({
    action: "create",
    uuid: "uuid-for-the-record-to-delete",
  }),
});
```
##### Curl POST (Delete)
```sh
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","uuid":"1234"}' \
  "https://script.google.com/macros/s/{deploymentId}/api/Sheet1"

```

#### ✅ Standard JSON Response Format

🔧 **How Responses Are Returned**
Every API endpoint (GET / POST) returns data using a unified response builder.
This ensures that all responses share a consistent JSON structure, making them predictable and easy to consume from frontend apps. All API responses follow this structure:

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Data retrieved successfully",
  "data": { ... } // optional
}

```

| Field        | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `statusCode` | Based on HTTP status codes (200, 400, 401, 404, 500, etc.)                   |
| `success`    | Boolean. Automatically `true` for 2xx codes, otherwise `false`.              |
| `message`    | Developer-friendly message.                                                  |
| `data`       | Optional — included only when response contains payload (e.g., GET results). |

#### 📌 Response Cheat Sheet

| Use Case                           | Helper                                          |
| ---------------------------------- | ----------------------------------------------- |
| Success (GET/POST/UPDATE)          | `serverResponse().ok("Message", data)`          |
| Invalid request payload            | `serverResponse().badRequest()`                 |
| User not logged in / invalid OAuth | `serverResponse().unauthorized()`               |
| User does not have permission      | `serverResponse().forbidden()`                  |
| Record not found (invalid UUID)    | `serverResponse().notFound()`                   |
| Any unexpected error               | `serverResponse().internalError(err.message)`   |
| Custom code (e.g. `201 Created`)   | `serverResponse().custom(201, "Created", data)` |

> ✨ The API never returns HTML, always valid JSON.

---
## 🚀 Deployment

After configuring Sheets and Script:

1. Go to `Extensions` → `Apps Script`
2. Click `Deploy` > `New deployment`
3. Select `Web App`
4. Settings:

- Execute as: Me
- Who has access: Anyone / or Only authenticated users.

5. Click Deploy
6. Copy the **`Web App URL`** → this is your **`API endpoint`**


---
## JSON INPUT CONFIGURATION

> The system will auto-added this `json` object as `note` in every `header`. And use it to generate the input for building correlated form. but you can customize it later, this detailed section will guide you how to do it.

We split the object into 2 Level properties:

- `1st Level` : the same level with `type` property (will match default `input/select/checkbox` attributes).
- `2nd Level` : under the `config` object property (contains for more customization).

> by default the system will set the input `id` using the `object.title`

```js
// default generated input config note
{
  type: "text", // (required)
  title: "", // <= default is the header text (required)
  required: true,
  config: { // <= for more customization
    useLabel: true, // <= using label at each input field (optional)
  },
}
```

### 🧱 1. Top-level Properties

These define the input attributes — similar to standard HTML input attributes.
| Property | Type | Description | Example |
| ------------- | ------- | ---------------------------------------------- | -------------------------------------------------------- |
| `type` | string | Determines input type | `"text"`, `"number"`, `"select"`, `"file"`, `"textarea"`, `"checkbox"`, `"date"`, `"radio"`, `"email"`, etc. |
| `id` | string | Unique identifier (auto-generated if empty) | `"product_name"` |
| `title` | string | Label text displayed above the input | `"Product Name"` |
| `placeholder` | string | Placeholder shown inside the input | `"Enter product name"` |
| `rows` | number | For textarea type only; defines height | `3` |
| `multiple` | boolean | Allow multiple values (file, select, checkbox) | `true` |
| `disabled` | boolean | Disable user input | `false` |
| `required` | boolean | Make the field mandatory | `true` |
| `checked` | boolean | Pre-check for radio/checkbox inputs | `false` |

Those are some properties you can use, other properties not listed above like: `max`, `min`, `step`, `date-max`, `date-min`, `pattern` etc. also can be used to build the input.

### 2. config — Configuring Behavior & Semantic UI Input Styling

The config object controls visual appearance like Semantic UI behavior.
See full documentation: [Semantic UI Elements](https://fomantic-ui.com/elements/input.html).
| Property | Type | Description | Example |
| ---------- | ------- | -------------------------------------------------- | --------------------------------------------------------- |
| `style` | string | Semantic UI style modifiers | `"toggle"`, `"loading"`, `"labeled"`, `"icon"`, `"action"` |
| `field` | string | Semantic wrapper type | `"field"` (default), `"grouped fields"`, `"inline field"` |
| `class` | string | Custom CSS classes | `"primary"`, `"error"` |
| `options` | array | List of items for `select`, `radio`, or `checkbox` | `[ { text: "Yes", value: "Y" } ]` |
| `range` | string | `Named Range` used for populating `select`, `radio`, or `checkbox` options | `Sheet1CategoryRange` |
| `position` | string | Position of icons or labels | `"left"`, `"right"` |
| `icon` | string | Semantic UI icon name | `"search"`, `"upload"`, `"calendar"` |
| `content` | string | Extra text label or button near input | `"Add"`, `"Clear"` |
| `wide` | number | Grid width (1–16) | `8` |
| `useLabel` | boolean | Show or hide label | `true` or `false` |

### Usage Examples

1. Example 1: **Text Input

```js
{
  type: "text",
  title: "Product Name",
  placeholder: "Enter product name",
  required: true,
  config: {
    style: "icon",
    icon: "tag",
    position: "left",
  },
}
```
**Rendered Input Element**
```html
<div class="field">
  <label for="product-name">Product Name</label>
  <div class="ui left icon input">
    <input id="product-name" name="product-name" type="text" placeholder="Enter product name" required />
    <i class="tag icon"></i>
  </div>
</div>
```

2. Example 2: **Select Dropdown

```js
{
  type: "select",
  title: "Category",
  required: true,
  config: {
    style: "search selection",
    // there is 2 way to get and populate the options, choose 1 which you prefered
    // 👇 1st using `Named Range` in `vars` sheet tab
    range: "Sheet1CategoryRange",
    // 👇 2nd manually hardcode the options in Array of string
    options: ["Category A", "Category B", "Category C"],
    // 👇 or use hardcode it using Array of object {text: string; value: any}[]
    options: [
      { label: "Category A", value: "A", icon: "building" },
      { label: "Category B", value: "B", icon: "warehouse" },
      { label: "Category C", value: "C", icon: "home" },
      // icon property is optional. is uses Semantic-UI icon.
      // detail here: https://fomantic-ui.com/elements/icon.html
    ],
  },
}
```
**Rendered Input Element**
```html
<div class="field">
  <label name="category">Category</label>
  <div id="category" class="ui fluid required search selection dropdown">
    <input name="category" type="text" required />
    <i class="dropdown icon"></i>
    <div class="menu">
      <div class="item" data-value="A">Category A</div>
      <div class="item" data-value="B">Category B</div>
      <div class="item" data-value="C">Category C</div>
    </div>
  </div>
</div>
```

3. Example 3: **Toggle Checkbox

```js
{
  title: "Auto Translate",
  type: "checkbox",
  checked: true, // <= if you want the default value is checked
  config: {
    wide: 4,
    style: "toggle",
  },
},
```
**Rendered Input Element**
```html
<div class="four wide field">
  <label for="auto-translate">Auto Translate</label>
  <div id="auto-translate" class="ui toggle checkbox checked">
    <input type="checkbox" name="auto-translate" checked="" tabindex="0" class="hidden" /><label>ON</label>
  </div>
</div>
```

4. Example 4: **Action Input

```js
{
  title: "Max File Size",
  type: "number",
  placeholder: "Max file size limit allowed to upload in MB",
  value: 5 / (1024 * 1024),
  config: {
    style: "action",
    content: {
      label: "MB",
      text: "Edit"
      }
  },
},
```
**Rendered Input Element**
```html
<div class="field">
  <label for="max-file-size">Max File Size</label>
  <div class="ui action input">
    <input
      id="max-file-size"
      name="max-file-size"
      placeholder="Max file size limit allowed to upload in MB"
      type="number"
      readonly="readonly"
    />
    <div class="ui basic label disabled">MB</div>
    <button class="ui button" style="justify-content: center;">Edit</button>
  </div>
</div>
```

### 🔗 Reference

- Semantic UI (Fomantic): https://fomantic-ui.com/
- Semantic Input Docs: https://fomantic-ui.com/elements/input.html
- Semantic Dropdown Docs: https://fomantic-ui.com/modules/dropdown.html

### ✅ Summary

You start with:

- Copy template
- Click one button (Setup)
- Configure settings (optional)
- Start creating Tables and Forms

What you get

- No backend.
- No hosting.
- No coding required.

🤝 Built by AIO Technology
