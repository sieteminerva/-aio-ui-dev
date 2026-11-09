# JSON INPUT CONFIGURATION

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

1. Example 1: \*\*Text Input

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

2. Example 2: \*\*Select Dropdown

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

3. Example 3: \*\*Toggle Checkbox

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

4. Example 4: \*\*Action Input

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
  ```