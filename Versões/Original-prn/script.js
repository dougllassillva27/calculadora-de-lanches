let convertedData = [];

document.getElementById('fileInput').addEventListener('change', handleFile);

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        console.log("File data loaded:", data); // Log the file data
        const workbook = XLSX.read(data, { type: 'array' });
        console.log("Workbook loaded:", workbook); // Log the loaded workbook

        const sheetName = workbook.SheetNames[0];
        console.log("Sheet name:", sheetName); // Log the sheet name
        const sheet = workbook.Sheets[sheetName];

        // Use header: 1 and set defval: '' to treat all rows as data (without treating any row as a header)
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        console.log("Parsed JSON data:", jsonData); // Log the parsed data from the sheet
        
        // Now we process the rows
        const headers = jsonData[0];  // First row will be treated as data
        const rows = jsonData.slice(1); // Remaining rows as data
        console.log("Processed Headers:", headers); // Log headers
        console.log("Processed Rows:", rows); // Log rows
        
        // Now processing the data, starting with the first row
        processExcelData(jsonData);
    };
    reader.readAsArrayBuffer(file);
}

function processExcelData(data) {
    console.log("Raw data before processing:", data); // Log the raw data

    // Não removemos a primeira linha, ela deve ser processada
    const headers = data[0];  // Primeira linha como dados
    const rows = data.slice(1);  // As outras linhas

    console.log("Headers (first row):", headers); // Log dos dados da primeira linha
    console.log("Rows to process:", rows); // Log das linhas restantes

    convertedData = rows.flatMap(row => {
        console.log("Processing row:", row); // Log cada linha sendo processada

        const pis = row[0];
        const date = row[1] ? row[1].replace(/\s[A-Z]+$/, '') : null; // Remove day prefix

        // Skip rows with "Folga" or "Feriado" in any of the time columns
        if (row.slice(2).some(cell => /Folga|Feriado|Falta|Justificado/i.test(cell))) {
            console.log("Skipping row due to 'Folga', 'Feriado', 'Falta', or 'Justificado':", row); // Log skipped rows
            return [];
        }

        return headers.slice(2).map((col, index) => {
            let time = row[index + 2];
            if (time) {
                time = time.replace(/\s*\(I\)/i, ''); // Remove "(I)" from times
            }
            return time ? { PIS: pis, Date: date, Time: time } : null;
        }).filter(entry => entry);
    });

    displayData(convertedData);
}

function displayData(data) {
    const output = document.getElementById('output');
    output.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

function downloadPRN() {
    if (!convertedData.length) {
        alert('No data to download. Please upload an Excel file first.');
        return;
    }

    // Get the name of the uploaded file
    const fileInput = document.getElementById('fileInput');
    const uploadedFileName = fileInput.files[0].name.replace(/\.[^/.]+$/, ""); // Remove file extension

    const prnContent = [
        ['PIS', 'Date', 'Time'],
        ...convertedData.map(row => [row.PIS, row.Date, row.Time])
    ]
        .map(e => e.join(';')) // Use semicolon as delimiter
        .join('\r\n'); // PRN uses CRLF for line breaks

    const blob = new Blob([prnContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${uploadedFileName}.prn`; // Set the downloaded file name with the same name as the uploaded file
    link.click();
    URL.revokeObjectURL(url);
}
