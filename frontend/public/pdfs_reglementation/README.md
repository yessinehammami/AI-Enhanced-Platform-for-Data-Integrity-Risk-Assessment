# PDF Library Folder

This folder contains PDF files that will be made available to users through the Library page.

## How to add PDFs:

1. **Place your PDF files** in this directory (`public/pdfs/`)
2. **Access them** through the `/library` route in the application

## Example:

If you add a file named `guidelines.pdf`, it will be accessible as `/pdfs/guidelines.pdf` and will appear in the Library page.

## Notes:

- PDF files must be in the `public/pdfs/` folder
- The filename should include the `.pdf` extension
- File size and upload date will be handled by the backend API (configure the `/api/pdfs` endpoint)
- If no backend API is configured, users can still manually add files and the app will display them

## Backend Integration (Optional):

To display file metadata (size, upload date), implement a backend API endpoint at `/api/pdfs` that returns:

```json
[
  {
    "name": "filename.pdf",
    "displayName": "Human-Readable Name",
    "size": 1024000,
    "uploadDate": "2025-03-03"
  }
]
```
