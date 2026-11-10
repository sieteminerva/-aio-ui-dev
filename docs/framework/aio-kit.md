# *Your All-in-One CLI for AIO Masterpieces*

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) <!-- Add your license badge here -->
[![Version](https://img.shields.io/badge/version-v0.1.0-brightgreen)](CHANGELOG.md) <!-- Add your version badge here -->

**AIO Kit** is an interactive command-line interface (CLI) designed to streamline and simplify the creation of "AIO masterpieces."  Whether you're starting a new project, generating data, manipulating files, processing text, or publishing your work, AIO Kit provides a unified and efficient workflow.

## Features

*   **Project Generation:** Quickly scaffold new projects with pre-configured structures.
*   **Data Generation:** Create JSON data sets with ease, perfect for testing and development.
*   **File Conversion:** Convert between various file formats, simplifying data management.
*   **Text Processing:** Powerful text manipulation and analysis tools for cleaning, transforming, and extracting insights from text.
*   **Image Processing:** Powerful image manipulation for converting, resizing, and watermarking between different formats.
*   **Publishing:** Streamline the process of publishing your AIO creations.

## Getting Started

### Installation

1.  **Prerequisites:** Ensure you have Node.js and npm (or yarn) installed on your system.
2.  **Install AIO Kit globally:**

```bash
    npm install -g aio-kit
```

### Usage

Once installed, you can access AIO Kit's functionalities through the `aio` command in your terminal.

## AIO Kit Commands

AIO Kit offers a set of intuitive commands, each with a short alias for quick access.

### Help
This command serves as the entry point to display the list of all available CLI commands. It allows users to know available commands of the application.

```bash
    aio  # To start the prompt help:
```


### 1. Start Dialog

   **Command:** `aio start` or `aio S`
   **Description:** Defines the 'start' command for the CLI. This command serves as the entry point to display the main list of available CLI commands.
   It allows users to navigate through different features of the application.
   **Example:**

```bash

    aio start  # Starts the interactive dialog
    aio S    # Alias for aio start

```

### 2. Project Generation

   **Command:** `aio new` or `aio N`
   **Description:**  Initiates the creation of a new project. The CLI will guide you through the process, prompting you for project details like name, type, and desired features.
   **Example:**

```bash
    aio new  # Starts the interactive project creation process
    aio N    # Alias for aio new
    # To create a new project named 'my-new-project':
    aio new -n my-new-project
```

### 3. Data Generation

   **Command:** `aio generate` or `aio G`
   **Description:** Generates JSON data based on your specifications. You can define the structure and content of the JSON data interactively.
   **Example:**

```bash
    aio generate # Starts the interactive JSON data generation process
    aio G        # Alias for aio generate
```

### 4. Utility Dialog

   **Command:** `aio utility` or `aio U`
   **Description:** The interactive dialog that allow the users to navigate between AIO-KIT utility functionality. The CLI will guide you through selecting the features, input and output formats.
   **Example:**

```bash
    aio utility # Starts the interactive file conversion process
    aio U       # Alias for aio utility
```

### 5. Text Processing

   **Command:** `aio textminator`, `aio text`, or `aio T`
   **Description:** Offers a suite of text processing capabilities, including cleaning, transformation, and analysis.
   **Options:** The text processing method to use.
    *Available choices*: `summarized`, `translate`, `split`, `findMatch`, `purify`, `analyze`, `replace`, `merge`.
   **Example:**

```bash
    aio textminator # Starts the interactive text processing
    aio text        # Alias for aio textminator
    aio T           # Alias for aio textminator

    # To summarize a text:
    aio textminator -e summarized
    # To translate a text:
    aio textminator -e translate
    # To split a text:
    aio textminator -e split
```
### 6. File Conversion

   **Command:** `aio file` or `aio F`
   **Description:** Converts files between different formats. The CLI will guide you through selecting the input and output formats.
   **Example:**
```bash
     # To convert a file named 'myFile.txt' and 
     # save it to the './output' directory:
     aio file --name myFile.txt --path ./output
     # To convert a file named 'data.json' and 
     # save it to the current directory:
     aio file --name data.json --path .
     # To start the file converter prompt without 
     # specifying a file name or path:
     aio file
```

### 7. Publishing / Compile Declarations

   **Command:** `aio publish` or `aio P`
   **Description:**  Streamlines the process of publishing your AIO project. This might include tasks like building, bundling, and deploying.
   **Example:**

```bash
    aio publish  # Starts the publishing process
    aio P        # Alias for aio publish
    # To generate index files in the './src' directory:
    aio publish -p ./src
    # To generate index files with the name 'main' 
    # in the './lib' directory:
    aio publish -p ./lib -n main
```

### 8. Image Conversion

   **Command:** `aio publish` or `aio P`
   **Description:**  This command is used to process image files, such as converting them to different formats. 
   **Options:** It allows users to specify the file name and the destination path.
  + `-n, --name [filename]`: Specifies the name of the file to be processed.
  + `-p, --path [path]`: Specifies the source path location where the file is located.
   **Example:**

```bash
    # To process an image file named 'myImage.png' 
    # and save it to the './output' directory:
    aio image --name myImage.png --path ./output
    # To process an image file named 'picture.jpg' 
    # and save it to the current directory:
    aio image --name picture.jpg --path .
    # To start the image processor prompt without 
    # specifying a file name or path:
    aio image
```

### 9. Image Optimizer

   **Command:** `aio publish` or `aio P`
   **Description:**  This command is used to optimize image files for production, reducing their file size while maintaining quality.
   **Options:** It allows users to specify the source path and the file name of the image to be optimized.
  + `-n, --name [filename]`: Specifies the name of the file to be processed.
  + `-p, --path [path]`: Specifies the source path location where the file is located.
   **Example:**

```bash
    # To optimize an image file named 'myImage.png' 
    # located in the './images' directory:
    aio optimizer -p ./images -n myImage.png
    # To optimize an image file named 'picture.jpg' 
    # located in the current directory:
    aio optimizer -p . -n picture.jpg
    # To start the image optimizer prompt without 
    # specifying a file name or path:
    aio optimizer
```

## Contributing

We welcome contributions to AIO Kit! If you'd like to contribute, please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them.
4.  Push your branch to your fork.
5.  Submit a pull request.

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on the GitHub repository.

## Changelog

See CHANGELOG.md for details on changes between versions.

## Roadmap

* [ ] Add testing using jest.
* [ ] Add more file conversion options.
* [ ] Implement more advanced text processing features.
* [ ] Add support for different project templates.
