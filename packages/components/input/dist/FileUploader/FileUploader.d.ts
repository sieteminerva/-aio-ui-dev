/**
 * Where this sheet is fetched from, spelled as the host keys it.
 *
 * Resolution falls back to the file name, so this must end in the same name the host
 * uses (`@aio-ui/input/file-uploader.css`) — `"./FileUploader.css"` matched nothing and
 * the uploader rendered unstyled without an error.
 */
export declare const FILE_UPLOADER_STYLESHEET = "./file-uploader.css";
interface FileUploaderConfigMessages {
    selectedFiles: (count: number) => string;
    readyFiles: (count: number) => string;
    unAllowedFiles: (count: number) => string;
    tooMany: (limit: number) => string;
    tooLarge: (maxSize: string) => string;
    nearLimit: (warnSize: string) => string;
    notAccepted: (acceptablefileType: string) => string;
}
interface FileUploaderConfig {
    accept?: string[];
    input?: string;
    closeButton?: string;
    maxFileSize?: number;
    maxUpload?: number;
    warnFileSize?: number;
    view?: string;
    renderThumbnail?: boolean;
    renderDetails?: boolean;
    groupUnallowed?: boolean | string;
    messages?: FileUploaderConfigMessages;
}
interface FileValidationResult {
    allowed: boolean;
    unAllowedGroup?: boolean;
    message: string | null;
    name: string;
    notAccepted?: boolean;
    maxFileSize?: boolean;
    warning?: boolean;
}
interface FileValidationEntry {
    file: File;
    validation: FileValidationResult;
}
/**
 * @class
 * @classdesc
 *  A robust file upload manager that handles file selection, validation, and UI rendering.
 *
 * This class provides a comprehensive solution for managing file inputs, including:
 * - Drag-and-drop support.
 * - Real-time validation (file size, MIME types, upload limits).
 * - Customizable UI views (thumbnails or list).
 * - Automatic integration with Google Apps Script (via binary byte-stream conversion).
 * - Support for multiple instances on a single page.
 */
export declare class FileUploader {
    private static _configDefaults?;
    private input;
    private container;
    private viewContainer;
    private uploadInfo;
    private filesToUpload;
    private _selectedFiles;
    private unAllowedFiles;
    private _config;
    /**
     * @typedef {Object} FileUploaderConfigMessages
     * @property {function(number): string} selectedFiles - Message for selected files count.
     * @property {function(number): string} readyFiles - Message for files ready to upload count.
     * @property {function(number): string} unAllowedFiles - Message for unallowed files count.
     * @property {function(number): string} tooMany - Message when too many files are selected.
     * @property {function(string): string} tooLarge - Message when a file exceeds max size.
     * @property {function(string): string} nearLimit - Message when a file is near max size.
     * @property {function(string): string} notAccepted - Message when a file type is not accepted.
     */
    /**
     * @typedef {Object} FileUploaderConfig
     * @property {string[]} [accept=["image/*", ".pdf"]] - Accepted file types/extensions.
     * @property {string} [input='input[type="file"][data-uploader]'] - Selector for file input elements.
     * @property {string} [closeButton=".close.icon"] - Selector for close button.
     * @property {number} [maxFileSize=5242880] - Maximum file size in bytes (default 5MB).
     * @property {number} [maxUpload=10] - Maximum number of files allowed to upload.
     * @property {number} [warnFileSize=2097152] - File size in bytes to trigger a warning (default 2MB).
     * @property {"thumbnails"|"list"|string} [view="thumbnails"] - Display mode for selected files.
     * @property {boolean} [renderThumbnail=true] - Whether to render image thumbnails.
     * @property {string|boolean} [groupUnallowed=true] - Whether to group unallowed files in the display.
     * @property {FileUploaderConfigMessages} [messages] - Custom messages for various scenarios.
     */
    /**
     *
     * @description
     * Initializes a new FileUploader instance for a given file input element.
     * It prevents multiple instances on the same input and sets up drag-and-drop functionality,
     * file selection change listeners, and configuration based on defaults, provided config,
     * and data attributes on the input element.
     *
     * @example
     * // Initialize a file uploader on an input with data-uploader attribute
     * const inputElement = document.querySelector('input[type="file"][data-uploader]');
     * const uploader = new FileUploader(inputElement, {
     *   maxUpload: 5,
     *   accept: ["image/png", ".jpg"],
     *   view: "list"
     * });
     *
     * @example
     * // Access static methods
     * FileUploader.initAll(); // Initializes all uploaders on the page
     * const files = FileUploader.getFiles("myFormId"); // Get files from a form
     *
     * @param {HTMLInputElement} input - The file input element to attach the uploader to.
     * @param {FileUploaderConfig} [config={}] - Configuration options for the uploader.
     * @throws {Error} (Implicit) If `input` is not a valid HTMLInputElement or its `closest('.field')` fails.
     *
     * @summary
     * 1. **Instance Check**: Prevents re-initialization if an instance already exists on the input.
     * 2. **DOM References**: Stores references to the input and its closest field container.
     * 3. **Config Merging**: Merges default, provided, and data-attribute configurations.
     * 4. **UI Setup**: Creates a `viewContainer` for displaying file previews.
     * 5. **State Initialization**: Sets up arrays for `filesToUpload`, `_selectedFiles`, and `unAllowedFiles`.
     * 6. **Event Listeners**: Attaches `change` and drag-and-drop listeners.
     * 7. **Form Reset Listener**: Adds a global reset listener to the parent form if not already bound.
     * 8. **Instance Storage**: Stores the instance on the input element for future reference.
     */
    constructor(input: HTMLInputElement, config?: Partial<FileUploaderConfig>);
    /**
     * @private
     *
     * @description
     * Attaches an event listener to the file input element to handle file selections.
     * When files are selected (or changed), it converts the FileList to an array and
     * passes them to the `handleFiles` method for processing.
     *
     * @returns {void}
     *
     * @example
     * // This method is called internally by the constructor.
     * // It listens for the 'change' event on `this.input`.
     *
     * @summary
     * 1. **Event Listener**: Adds a 'change' event listener to `this.input`.
     * 2. **File Extraction**: When the event fires, it extracts the selected files from `e.target.files`.
     * 3. **File Handling**: Converts the `FileList` to an array and calls `this.handleFiles` with the new files.
     */
    _onSelectionChange(): void;
    /**
     * @private
     *
     * @description
     * Attaches event listeners for drag-and-drop functionality to the file input's container.
     * It handles `dragover`, `dragleave`, and `drop` events to allow users to drag files
     * onto the input area, visually indicating the drag state and processing the dropped files.
     *
     * @returns {void}
     *
     * @summary
     * 1. **Drag Over**: Adds a `dragover` event listener to prevent default to allow dropping,
     *    and adds a `dragover` class to the container for visual feedback.
     * 2. **Drag Leave**: Removes the `dragover` class when a file is dragged out of the container.
     * 3. **Drop**: Prevents default on `drop`, removes the `dragover` class,
     *    extracts files from the `dataTransfer` object, and calls `this.handleFiles` to process them.
     */
    _onDragNdrop(): void;
    /**
     * @private
     *
     *
     * @description
     * Attaches a click event listener to a close icon associated with a file item in the UI.
     * When clicked, it removes the visual representation of the file, updates the internal
     * `_selectedFiles` array, and re-processes the remaining files to ensure the UI and
     * internal state are consistent. If no files remain, it clears the entire view.
     *
     * @param {File} file - The File object corresponding to the item being removed.
     * @param {HTMLElement} closeIcon - The DOM element (e.g., an icon or button) that triggers the removal.
     * @param {HTMLElement} wrapper - The DOM element that visually represents the file item (e.g., a div containing the thumbnail and info).
     * @returns {void}
     *
     * @example
     * // This method is called internally when rendering file items.
     * // `this._onCloseRemoveItem(fileObject, closeButtonElement, fileItemWrapperElement);`
     *
     * @summary
     * 1. **Event Listener**: Attaches a 'click' listener to the `closeIcon`.
     * 2. **UI Removal**: Removes the `wrapper` element from the DOM.
     * 3. **State Update**: Filters `_selectedFiles` to remove the specified `file`.
     * 4. **Conditional Clear/Re-process**: If no files remain, calls `clearView(true)`. Otherwise, calls `handleFiles([])` to re-evaluate and re-render the current `_selectedFiles`.
     */
    _onCloseRemoveItem(file: File, closeIcon: HTMLElement, wrapper: HTMLElement): void;
    /**
     *
     * @param {File[]} newFiles - An array of new File objects to be added and processed.
     *
     * @description
     * Processes a new set of files, merging them with already selected files,
     * validating them against configured rules (max size, accepted types, max upload count),
     * and then updating the UI to reflect the current state of allowed and unallowed files.
     * It ensures that the native file input's `files` property is updated to only contain
     * the files that are deemed "allowed" for upload.
     *
     * @example
     * // Called when files are selected via input change or drag-and-drop.
     * // `uploader.handleFiles(e.target.files);`
     *
     * @returns {void}
     *
     * @summary
     * 1. **File Key Generation**: Defines a unique key for each file based on name, size, and last modified date.
     * 2. **Merge New Files**: If `newFiles` are provided, it merges them into `_selectedFiles`, avoiding duplicates.
     * 3. **Reset Partitions**: Clears `filesToUpload` and `unAllowedFiles` for a fresh evaluation.
     * 4. **Initial Validation**: Runs `runValidation` on all `_selectedFiles` to get base validation results, without considering `maxUpload` yet.
     * 5. **Select Allowed Files (up to maxUpload)**: Filters for initially allowed files and selects a subset based on `maxUpload` limit.
     * 6. **Final Validation Pass**: Re-evaluates all `_selectedFiles` against the `maxUpload` limit, demoting files that were initially allowed but exceed the limit.
     * 7. **Sort Files**: Sorts the files based on their validation status (allowed first, then warnings, then hard failures).
     * 8. **Update Partitions**: Populates `filesToUpload` and `unAllowedFiles` based on the final sorted validations.
     * 9. **Update Native FileList**: Attempts to update the native `input.files` property with only the `filesToUpload`.
     * 10. **Render View**: Calls `renderView` to update the UI with the processed files.
     */
    handleFiles(newFiles: File[], emitChange?: boolean): void;
    /**
     *
     * @param {Object[]} validations - An array of objects, each containing a `File` object and its `validation` result.
     *
     * @description
     * Renders the visual representation of the selected files (both allowed and unallowed)
     * based on the configured `view` mode ("list" or "thumbnails"). It first clears
     * any existing view and then calls the appropriate build method (`_buildListView` or `_buildThumbnailsView`).
     * Finally, it updates the upload information summary.
     *
     * @returns {void}
     *
     * @example
     * // Called internally by `handleFiles` after file processing.
     * // `this.renderView(finalValidationResults);`
     *
     * @summary
     * 1. **Reset UI**: Clears the `viewContainer`'s content and class, then adds the appropriate view class and removes 'hidden'.
     * 2. **Conditional Build**: Calls `_buildListView` if `config.view` is "list", otherwise calls `_buildThumbnailsView`.
     * 3. **Update Info**: Calls `updateUploadInfo` to display a summary of selected and allowed files.
     */
    renderView(validations: FileValidationEntry[]): void;
    /**
     * @private
     *
     *
     * @description
     * Removes the file uploader and cleans up all associated event listeners and DOM elements.
     * This method should be called when the file uploader is no longer needed to prevent memory leaks.
     *
     * @returns {void}
     *
     * @summary
     * 1. **Remove Element**: Removes the main `container` element from the DOM.
     * 2. **Clean State**: Resets the `input`, `container`, `viewContainer`, `uploadInfo`, and file arrays.
     * 3. **Event Cleanup**: Removes all event listeners attached to the input and its container.
     *
     * @example
     * // Call this method when you want to remove the file uploader.
     * // `uploaderInstance.destroy();`
     */
    destroy(): void;
    /**
     * @private
     *
     * @param {Object[]} validations - An array of objects, each containing a `File` object and its `validation` result.
     *
     * @description
     * Builds and appends the list-style view for files to the `viewContainer`.
     * Each file is represented as an `item` with a thumbnail (if enabled), content (message),
     * file size, and a close button. It also handles grouping of unallowed files if configured.
     *
     * @returns {void}
     *
     * @example
     * // Called internally by `renderView` when `config.view` is "list".
     * // `this._buildListView(validations);`
     *
     * @summary
     * 1. **Initialize Counter**: Sets `countMSNA` to track files unallowed due to max size or non-acceptance.
     * 2. **Iterate Validations**: Loops through each file and its validation result.
     * 3. **Skip Grouped Unallowed**: If `groupUnallowed` is true and the file is part of an `unAllowedGroup` (exceeded max upload count), it skips rendering the individual item.
     * 4. **Count Max Size/Not Accepted**: Increments `countMSNA` for files unallowed due to size or type, if `groupUnallowed` is active.
     * 5. **Create Item Elements**: Creates `div.item`, `div.content`, `div.label.filesize`, and `div.close.button` for each file.
     * 6. **Thumbnail**: Creates and appends a thumbnail if `renderThumbnail` is true.
     * 7. **Message**: Appends the file message (name, status, validation message).
     * 8. **File Size**: Displays the formatted file size and adds 'unallowed' class if applicable.
     * 9. **Close Button**: Creates a close button and attaches `_onCloseRemoveItem` listener.
     * 10. **Append to View**: Appends all created elements to the `item`, then appends the `item` to `viewContainer`.
     * 11. **Grouped Summary**: If `groupUnallowed` is true and there are files exceeding the max upload limit, it creates and appends a summary item for them.
     */
    _buildListView(validations: FileValidationEntry[]): void;
    /**
     * @private
     *
     * @param {Object[]} validations - An array of objects, each containing a `File` object and its `validation` result.
     *
     * @description
     * Builds and appends the thumbnail-style view for files to the `viewContainer`.
     * It creates two main rows: one for thumbnails and one for details (messages).
     * Each file's thumbnail is displayed with its size and a close button, and its
     * validation message is shown in the details row. It also handles grouping of
     * unallowed files if configured.
     *
     * @returns {void}
     *
     * @example
     * // Called internally by `renderView` when `config.view` is "thumbnails".
     * // `this._buildThumbnailsView(validations);`
     *
     * @summary
     * 1. **Create Row Containers**: Creates `rowThumbs` for thumbnails and `rowDetails` for messages.
     * 2. **Initialize Counter**: Sets `countMSNA` to track files unallowed due to max size or non-acceptance.
     * 3. **Iterate Validations**: Loops through each file and its validation result.
     * 4. **Skip Grouped Unallowed**: If `groupUnallowed` is true and the file is part of an `unAllowedGroup`, it skips rendering the individual item.
     * 5. **Count Max Size/Not Accepted**: Increments `countMSNA` for files unallowed due to size or type, if `groupUnallowed` is active.
     * 6. **Create Item Elements**: Creates `div.item` for each file.
     * 7. **Thumbnail**: Creates and appends a thumbnail if `renderThumbnail` is true, adding 'unallowed' or 'warning' classes as needed.
     * 8. **File Size**: Displays the formatted file size.
     * 9. **Close Button**: Creates a close button and attaches `_onCloseRemoveItem` listener.
     * 10. **Append to Rows**: Appends the item to `rowThumbs` and the message to `rowDetails`.
     * 11. **Append Rows to View**: Appends `rowThumbs` and `rowDetails` to `viewContainer`.
     * 12. **Grouped Summary**: If `groupUnallowed` is true and there are files exceeding the max upload limit, it creates and appends a summary item for them in `rowDetails`.
     */
    _buildThumbnailsView(validations: FileValidationEntry[]): void;
    /**
     * @public
     *
     * @param {"list"|"thumbnails"} view - The current view mode ("list" or "thumbnails").
     * @param {string} msg - The validation message explaining why the files are unallowed.
     * @param {number} count - The number of unallowed files being grouped.
     *
     * @description
     * Creates a DOM element to display a grouped summary of unallowed files,
     * typically used when `groupUnallowed` is enabled and multiple files
     * exceed the `maxUpload` limit or are unallowed for other reasons.
     * The structure of the element varies slightly based on the `view` mode.
     *
     * @returns {HTMLElement} The created DOM element representing the grouped unallowed files message.
     *
     * @example
     * // Called internally by `_buildListView` or `_buildThumbnailsView` for grouped unallowed files.
     * // `this.createUnallowedItem("list", "Too many files selected.", 3);`
     *
     * @summary
     * 1. **Message Text**: Constructs a generic message indicating the number of files not uploaded.
     * 2. **List View**:
     *    - Creates a `div.item` as the main container.
     *    - Adds a generic file icon thumbnail.
     *    - Creates a `div.content` to hold the filename and info.
     *    - Displays the `messageText` as the filename.
     *    - Displays the specific `msg` from validation as info, with a 'times circle' icon.
     * 3. **Thumbnails View**:
     *    - Creates a `div.message.unallowed.group` as the main container.
     *    - Displays the `messageText` with a file icon as the filename.
     *    - Displays the specific `msg` from validation as info, with a 'times circle' icon.
     * 4. **Return Element**: Returns the constructed DOM element.
     *
     * @security
     * - Uses `textContent` for `msg` to prevent XSS when inserting validation messages.
     */
    createUnallowedItem(view: string, msg: string, count: number): HTMLDivElement;
    /**
     * @public
     *
     * @description
     * Creates a `div` element containing an `img` tag that displays a thumbnail
     * for the given file. If the file is an image, it uses `URL.createObjectURL`
     * to generate a preview. For other file types, it generates an SVG icon
     * based on the file extension.
     *
     * @param {File} file - The File object for which to create a thumbnail.
     * @returns {HTMLDivElement} The `div` element containing the thumbnail image.
     *
     */
    createImageThumbnail(file: File): HTMLDivElement;
    /**
     * @public
     *
     * @param {number} allSelectedFiles
     * @param {number} totalAllowedFiles
     * @returns {void}
     */
    updateUploadInfo(allSelectedFiles: number, totalAllowedFiles: number): void;
    /**
     * @public
     *
     *
     * @description
     * Creates a DOM element to display a file's name, status, and any associated validation message.
     * It includes an icon representing the file type and another icon indicating its validation status.
     *
     * @returns {HTMLDivElement} The created DOM element representing the file message.
     *
     * @example
     * // Called internally by `_buildListView` or `_buildThumbnailsView`.
     * // `this.createMessage(fileObject, { allowed: true, message: "Ready to upload" });`
     *
     * @summary
     * 1. **Create Wrapper**: Creates a `div` element with class "message" to contain the file information.
     * 2. **Define Icons**: Sets up an object mapping validation states ("allowed", "unallowed", "warning") to their respective Semantic UI icon HTML.
     * 3. **Filename Element**: Creates a `div` for the filename, including a file type icon and a truncated version of the file's name.
     * 4. **Info Element**: Creates a `div` for additional information or validation messages.
     * 5. **Conditional Message**: If a `validation.message` exists, it adds appropriate styling ("warning" or "unallowed") and displays the message along with its corresponding icon.
     * 6. **Default Message**: If no specific validation message, it displays "Ready to upload" with the "allowed" icon.
     * 7. **Append Elements**: Appends the filename and info elements to the wrapper.
     * 8. **Return Element**: Returns the constructed wrapper element.
     *
     * @param {File} file - The File object for which to create the message.
     * @param {Object} validation - The validation result object for the file.
     * @param {boolean} validation.allowed - Whether the file is allowed for upload.
     * @param {string} [validation.message] - The validation message (e.g., warning, error).
     */
    createMessage(file: File, validation: FileValidationResult): HTMLDivElement;
    /**
     * @public
     *
     *
     * @description
     * Clears the file uploader view and resets its internal state.
     * This method removes all file previews from the UI and clears the internal arrays that store file references.
     * It can optionally clear the actual file input element as well.
     *
     * @param {boolean} [clearInput=false] - If true, the file input element will also be cleared.
     * @returns {void}
     *
     * @example
     * // Clear the view and the input
     * uploaderInstance.clearView(true);
     *
     * @example
     * // Clear only the view, keeping the input value
     * uploaderInstance.clearView(false);
     *
     * @summary
     * 1. **View Container Cleanup**: Removes all content from `this.viewContainer` and hides it.
     * 2. **State Reset**: Clears the `filesToUpload` and `unAllowedFiles` arrays.
     * 3. **Optional Input Reset**: If `clearInput` is true, it also clears the `_selectedFiles` array and resets the value of the actual file input element.
     */
    clearView(clearInput?: boolean, emitChange?: boolean): void;
    /**
     * @typedef {Object} FileValidationResult
     * @property {boolean} allowed - True if the file is allowed for upload, false otherwise.
     * @property {boolean} [unAllowedGroup] - True if the file was disallowed because it exceeded the maxUpload limit.
     * @property {string|null} message - A message explaining the validation status (e.g., warning, error).
     * @property {string} name - The name of the file.
     * @property {boolean} [notAccepted] - True if the file type is not accepted.
     * @property {boolean} [maxFileSize] - True if the file size exceeds the maximum allowed.
     * @property {boolean} [warning] - True if the file triggers a warning (e.g., near max size).
     */
    /**
     * @public
     *
     * @description
     * Validates a given file against the configured rules such as maximum file size,
     * accepted file types, and maximum number of files allowed for upload.
     * It returns an object detailing the validation result, including whether the file is allowed,
     * any specific reasons for disallowance, and a user-friendly message.
     *
     * @param {File} file - The File object to validate.
     * @param {number} [index] - The index of the file in the selection. Used for `maxUpload` validation.
     * @returns {FileValidationResult} An object containing the validation status and message.
     *
     * @example
     * // Validate a file
     * const myFile = new File(["content"], "document.pdf", { type: "application/pdf" });
     * const validationResult = uploader.runValidation(myFile);
     * console.log(validationResult);
     * // { allowed: true, message: null, name: "document.pdf" }
     *
     * @example
     * // Validate a file that exceeds max size
     * const largeFile = new File(new ArrayBuffer(6 * 1024 * 1024), "large.jpg", { type: "image/jpeg" });
     * const validationResult = uploader.runValidation(largeFile);
     * console.log(validationResult);
     * // { allowed: false, maxFileSize: true, message: "Exceeds the maximum file size of 5.0 MB.", name: "large.jpg" }
     *
     * @example
     * // Validate a file that is beyond the maxUpload limit (assuming maxUpload is 2 and this is the 3rd file)
     * // const validationResult = uploader.runValidation(anotherFile, 2); // index 2 means 3rd file
     * // console.log(validationResult);
     * // { allowed: false, unAllowedGroup: true, message: "Maximum of 2 files allowed.", name: "another.png" }
     *
     * @summary
     * 1. **Extract Config**: Destructures relevant configuration properties.
     * 2. **Max Upload Check**: If `index` is provided and exceeds `maxUpload`, marks the file as `unAllowedGroup`.
     * 3. **Accepted File Type Check**: Uses `_isAcceptedFile` to check if the file type is allowed. If not, constructs a readable error message.
     * 4. **Max File Size Check**: Compares `file.size` with `maxFileSize`.
     * 5. **Warning File Size Check**: Compares `file.size` with `warnFileSize` to issue a warning if near the limit.
     * 6. **Default Allowed**: If all checks pass, the file is marked as allowed.
     */
    runValidation(file: File, index?: number): FileValidationResult;
    /**
     * @public
     *
     * @description
     * Getter for the merged configuration object. It combines the static default configuration
     * with any instance-specific configuration provided during instantiation.
     *
     * @returns {FileUploaderConfig} The merged configuration object for this instance.
     *
     * @example
     * const uploader = new FileUploader(inputElement, { maxUpload: 5 });
     * console.log(uploader.config.maxUpload); // Output: 5
     * console.log(uploader.config.view);     // Output: "thumbnails" (default)
     *
     * @summary
     * 1. **Merge Configurations**: Spreads the static `FileUploader.config` (defaults)
     *    and the instance's `_config` (overrides) into a new object.
     * 2. **Return Merged Config**: Returns the resulting merged configuration.
     */
    get config(): {
        accept?: string[];
        input?: string;
        closeButton?: string;
        maxFileSize?: number;
        maxUpload?: number;
        warnFileSize?: number;
        view?: string;
        renderThumbnail?: boolean;
        renderDetails?: boolean;
        groupUnallowed?: boolean | string;
        messages?: FileUploaderConfigMessages;
    } | {
        accept: string[];
        input: string;
        closeButton: string;
        maxFileSize: number;
        maxUpload: number;
        warnFileSize: number;
        view: string;
        renderThumbnail: boolean;
        renderDetails?: boolean;
        groupUnallowed: boolean | string;
        messages: FileUploaderConfigMessages;
        container: string;
        icons: {
            remove: string;
            allowed: string;
            unallowed: string;
            warning: string;
            image: string;
            audio: string;
            video: string;
            pdf: string;
            file: string;
            files: string;
        };
    };
    /**
     * @public
     *
     * @description
     * Getter for the default configuration object.
     *
     * @returns {FileUploaderConfig} The default configuration object for the FileUploader class.
     *
     * @example
     * console.log(FileUploader.config.maxUpload); // Output: 10
     * console.log(FileUploader.config.view);     // Output: "thumbnails" (default)
     *
     * @summary
     * 1. **Access Static Default Config**: Checks for a cached `_configDefaults` property.
     * 2. **Create Defaults if Needed**: If no cached defaults, it initializes a new configuration object
     *    with default values for all settings (e.g., `accept`, `maxFileSize`, `view`, etc.)
     * 3. **Return Defaults**: Returns the default configuration object.
     */
    static get config(): FileUploaderConfig | {
        accept: string[];
        input: string;
        container: string;
        closeButton: string;
        maxFileSize: number;
        maxUpload: number;
        warnFileSize: number;
        view: string;
        renderThumbnail: true;
        groupUnallowed: true;
        icons: {
            remove: string;
            allowed: string;
            unallowed: string;
            warning: string;
            image: string;
            audio: string;
            video: string;
            pdf: string;
            file: string;
            files: string;
        };
        messages: {
            selectedFiles: (count: number) => string;
            readyFiles: (count: number) => string;
            unAllowedFiles: (count: number) => string;
            tooMany: (limit: number) => string;
            tooLarge: (maxSize: string) => string;
            nearLimit: (warnSize: string) => string;
            notAccepted: (acceptablefileType: string) => string;
        };
    };
    /**
     *
     * @static
     *
     * @description
     * Setter for the static default configuration of the `FileUploader` class.
     * This allows global modification of default settings for all future `FileUploader` instances
     * that do not explicitly override these settings.
     *
     * @param {FileUploaderConfig} custom - An object containing custom configuration properties
     *   to merge with the existing static defaults.
     * @returns {void}
     *
     * @example
     * FileUploader.config = { maxUpload: 20, accept: ["image/*"] };
     * // Now, all new FileUploader instances will default to max 20 uploads and only images.
     *
     * @summary
     * 1. **Merge Custom Config**: Merges the provided `custom` configuration with the current static defaults.
     * 2. **Update Defaults**: Stores the new merged configuration as the static `_configDefaults`.
     */
    static set config(custom: FileUploaderConfig | {
        accept: string[];
        input: string;
        container: string;
        closeButton: string;
        maxFileSize: number;
        maxUpload: number;
        warnFileSize: number;
        view: string;
        renderThumbnail: true;
        groupUnallowed: true;
        icons: {
            remove: string;
            allowed: string;
            unallowed: string;
            warning: string;
            image: string;
            audio: string;
            video: string;
            pdf: string;
            file: string;
            files: string;
        };
        messages: {
            selectedFiles: (count: number) => string;
            readyFiles: (count: number) => string;
            unAllowedFiles: (count: number) => string;
            tooMany: (limit: number) => string;
            tooLarge: (maxSize: string) => string;
            nearLimit: (warnSize: string) => string;
            notAccepted: (acceptablefileType: string) => string;
        };
    });
    /**
     * @private
     *
     * @description
     * Synchronizes native input attributes with the resolved uploader configuration.
     * This keeps the browser file picker behavior aligned with the uploader logic.
     */
    private _syncInputAttributes;
    static reset(input?: HTMLInputElement | HTMLFormElement | null): void;
    /**
     * @static
     *
     * @description
     * Retrieves all files selected across all `FileUploader` instances within a specific form.
     * It groups the files by their input name attribute.
     *
     * @param {string} formId - The ID of the form element.
     * @returns {Object} An object where keys are the input names and values are arrays of File objects for that input.
     *
     * @example
     * const filesData = FileUploader.getFiles("myForm");
     * console.log(filesData); // { profilePic: [File...], gallery: [File...] }
     *
     * @summary
     * 1. **Find Form**: Locates the form element by ID or uses the document if no ID is provided.
     * 2. **Find Inputs**: Selects all file input elements within the form using the configured selector.
     * 3. **Collect Files**: Iterates through each input, retrieves the associated `FileUploader` instance.
     * 4. **Group by Name**: Collects the `filesToUpload` for each instance and groups them by the input's `name` attribute.
     * 5. **Return Result**: Returns the grouped files.
     */
    static getFiles(formId?: string | null): Record<string, File[]>;
    /**
     * @static
     *
     * @description
     * Processes all active file attachment inputs inside a target form, converting them
     * into clean, binary byte-stream payloads optimized for the Google Apps Script transport bridge.
     * This version uses FileReader with onload callback, which is more widely supported and performant for large files compared to the arrayBuffer() method.
     *
     * @param {string} formId - The HTML DOM element ID string for the form context
     * @returns {Promise<Object>} An object mapping input names to binary structural files
     */
    static getFilesForGoogleDrive(formId?: string | null): Promise<Record<string, {
        name: string;
        mimeType: string;
        size: number;
        bytes: number[];
    }[]>>;
    /**
     * @static
     *
     * @description
     * Initializes all `FileUploader` instances within a given DOM element.
     * It finds all file input elements with the `data-uploader` attribute and creates a `FileUploader` instance for each.
     * This method uses a global flag (`data-uploader-initialized`) to prevent re-initialization of the same element.
     *
     * @param {Document | HTMLFormElement | HTMLElement} [root=document] - The root element to search for file inputs. Defaults to the entire document.
     * @param {FileUploaderConfig} [config={}] - Optional configuration object to override default settings.
     * @returns {FileUploader[]} An array of all initialized `FileUploader` instances.
     *
     * @example
     * // Initialize all file uploaders in the document
     * const uploaders = FileUploader.initAll();
     *
     * // Initialize within a specific form
     * const form = document.getElementById("myForm");
     * const formUploaders = FileUploader.initAll(form);
     *
     * // With custom configuration
     * const customUploaders = FileUploader.initAll(document, { maxUpload: 5 });
     *
     * @summary
     * 1. **Set Default Config**: Applies the static `this.config` with any provided `config` overrides.
     * 2. **Find Inputs**: Selects all file inputs using the configured selector.
     * 3. **Iterate and Initialize**: Loops through each input.
     * 4. **Check Initialization**: Skips inputs that have already been initialized (checked via `data-uploader-initialized`).
     * 5. **Create Instance**: Creates a new `FileUploader` instance for the input, passing the element and config.
     * 6. **Mark as Initialized**: Sets a flag on the input to prevent re-initialization.
     * 7. **Collect Instances**: Adds the new instance to an array.
     * 8. **Return Result**: Returns the array of all `FileUploader` instances.
     * @memberof FileUploader
     */
    static initAll(root?: Document | HTMLFormElement | HTMLElement, config?: Partial<FileUploaderConfig>): FileUploader[];
    /**
     * @private
     *
     * @description
     * Formats a given number of bytes into a human-readable string (e.g., "1.2 MB", "500 KB").
     * It iteratively divides the byte count by 1024 and updates the unit until the value
     * is less than 1024 or the largest unit (GB) is reached.
     *
     * @param {number} bytes - The number of bytes to format.
     * @returns {string} The formatted file size string.
     *
     * @example
     * // Called internally to display file sizes.
     * // `this._formatFileSize(1234567);` // Returns "1.2 MB"
     *
     * @summary
     * 1. **Initialize Units**: Defines an array of size units (B, KB, MB, GB).
     * 2. **Iterate and Convert**: Divides `bytes` by 1024 and increments the unit index (`i`) until `bytes` is less than 1024 or the last unit is reached.
     * 3. **Format Output**: Returns the formatted number (to one decimal place) concatenated with the appropriate unit.
     */
    _formatFileSize(bytes: number): string;
    /**
     * @private
     *
     * @description
     * Checks if a given file's type or extension is accepted based on a list of rules.
     * The rules can be MIME types (e.g., "image/jpeg"), wildcard MIME types (e.g., "image/*"),
     * or file extensions (e.g., ".pdf").
     *
     * @param {File} file - The File object to check.
     * @param {string[]} acceptList - An array of strings representing accepted file types or extensions.
     * @returns {boolean} True if the file is accepted, false otherwise.
     *
     * @example
     * // Check if an image file is accepted
     * const imageFile = new File([], "photo.jpg", { type: "image/jpeg" });
     * uploader._isAcceptedFile(imageFile, ["image/*", ".png"]); // Returns true
     *
     * // Check if a PDF file is accepted by extension
     * const pdfFile = new File([], "document.pdf", { type: "application/pdf" });
     * uploader._isAcceptedFile(pdfFile, [".pdf"]); // Returns true
     *
     * @summary
     * 1. **Handle Empty Accept List**: If `acceptList` is empty or null, all files are accepted.
     * 2. **Normalize File Info**: Converts file name and type to lowercase for case-insensitive comparison.
     * 3. **Iterate Rules**: Loops through each rule in `acceptList`.
     * 4. **Normalize Rule**: Converts the current rule to lowercase and trims whitespace.
     * 5. **Extension Match**: If the rule starts with ".", checks if the file name ends with the rule.
     * 6. **Wildcard MIME Match**: If the rule ends with "/*", checks if the file type starts with the rule's prefix.
     * 7. **Exact MIME Match**: Otherwise, checks for an exact match with the file type.
     * 8. **Return Result**: Returns `true` if any rule matches, `false` otherwise.
     */
    _isAcceptedFile(file: File, acceptList: string[]): boolean;
    /**
     * @private
     *
     * @description
     * Returns an HTML string for a Semantic UI icon representing the file type.
     * It checks the file's MIME type and returns a specific icon for images, audio, video, and PDFs.
     * For any other file type, it returns a generic file icon.
     *
     * @param {File} file - The File object for which to get the icon.
     * @returns {string} An HTML string containing the `<i>` tag for the Semantic UI icon.
     *
     * @example
     * // Called internally to display file type icons.
     * // `this._getFileIconSVG(myImageFile);` // Returns `<i class="file image outline icon"></i>`
     * // `this._getFileIconSVG(myPdfFile);`   // Returns `<i class="file pdf outline icon"></i>`
     *
     * @summary
     * 1. **Check MIME Type**: Determines the file type category (image, audio, video, PDF).
     * 2. **Return Specific Icon**: Returns an appropriate Semantic UI icon HTML string based on the category.
     * 3. **Return Generic Icon**: If no specific category matches, returns a generic file icon.
     */
    _getFileIconSVG(file: File): "<i class=\"file pdf icon\"></i>" | "<i class=\"file icon\"></i>" | "<i class=\"file jpg icon\"></i>" | "<i class=\"file mp3 icon\"></i>" | "<i class=\"file mp4 icon\"></i>";
    /**
     * @private
     *
     * @description
     * Generates a Data URL for an SVG thumbnail representing the file, primarily for non-image files.
     * The SVG contains a file icon shape and the file's extension in uppercase.
     * The color of the SVG icon is determined by common file extensions (e.g., PDF, DOC, XLS).
     *
     * @param {File} file - The File object for which to generate the SVG thumbnail.
     * @returns {string} A Data URL (base64 encoded SVG) that can be used as an `<img>` src.
     *
     * @example
     * // Called internally to display thumbnails for non-image files.
     * // `this._getSvgThumbnail(myPdfFile);` // Returns a Data URL for a red PDF icon.
     *
     * @summary
     * 1. **Extract Extension**: Gets the file extension from the file name.
     * 2. **Determine Color**: Assigns a specific color based on common file extensions.
     * 3. **Construct SVG**: Builds an SVG string with a file shape and the uppercase extension.
     * 4. **Encode to Data URL**: Base64 encodes the SVG string and prepends the Data URL prefix.
     */
    _getSvgThumbnail(file: File): string;
}
export {};
//# sourceMappingURL=FileUploader.d.ts.map