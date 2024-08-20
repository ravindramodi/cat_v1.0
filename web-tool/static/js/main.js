$(document).ready(function () {
    let currentRow = 0; // Start from 0 to include the first row
    let currentImageIndex = 0;

    let changeLog = []; // Store changes here

    function cleanText(input) {
        return input.replace(/[^\x00-\x7F]/g, "").trim(); // Remove non-ASCII characters and trim whitespace
    }

    function loadRow(rowIndex) {
        if (rowIndex < 0 || rowIndex >= window.totalRows) return;
        currentRow = rowIndex;
        currentImageIndex = 0;
        const rowData = window.data[rowIndex];

        // Populate data table with editable cells using the dynamic column order
        const table = $('#data-table');
        table.empty();
        window.columnOrder.forEach(key => {
            const value = rowData[key] === null || rowData[key] === undefined ? '' : rowData[key];
            const row = `<tr>
                <th>${key}</th>
                <td contenteditable="true" data-key="${key}">${value}</td>
            </tr>`;
            table.append(row);
        });

        $('#row-indicator').text(`Row ${currentRow + 1} of ${window.totalRows}`);
        loadImage(0);
    }

    function loadImage(imageIndex) {
        const rowData = window.data[currentRow];
        const imageUrls = rowData['external_image_url'] ? rowData['external_image_url'].split(',').map(url => url.trim()) : [];

        if (imageIndex < 0 || imageIndex >= imageUrls.length) return;
        currentImageIndex = imageIndex;

        const url = imageUrls[imageIndex];

        if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            const imgElement = `<img id="zoom-image" src="${url}" alt="Image" class="content-display" style="position: relative; max-width: 100%;">`;
            $('#external-content').html(imgElement);

            setTimeout(function() {
                try {
                    $("#zoom-image").ezPlus({
                        zoomType: "window",
                        zoomWindowWidth: 300,
                        zoomWindowHeight: 300,
                        borderSize: 1,
                        zoomWindowFadeIn: 500,
                        zoomWindowFadeOut: 750,
                        lensShape: "round",
                        lensSize: 200
                    });
                } catch (error) {
                    console.error("Error initializing zoom:", error);
                }
            }, 100);
        } else {
            $('#external-content').html('<p>No valid image available</p>');
        }
    }

    function saveChanges() {
        const updatedData = {};
        const rowData = window.data[currentRow];
        const barcode = cleanText(rowData['barcode']); // Ensure barcode is normalized
        $('#data-table td').each(function () {
            const key = $(this).data('key');
            const newValue = cleanText($(this).text());
            const oldValue = cleanText(rowData[key]);

            // Log changes if a value has been modified
            if (newValue !== oldValue) {
                changeLog.push({
                    barcode: barcode,
                    column: key,
                    old_value: oldValue,
                    new_value: newValue
                });
            }
            updatedData[key] = newValue;
        });

        // Update the global data array with the edited data
        window.data[currentRow] = updatedData;

        alert("Changes saved locally. You can now download the updated file.");
    }

    function downloadChangeLog() {
        if (changeLog.length === 0) {
            alert("No changes have been made.");
            return;
        }

        // Create CSV content with proper encoding
        let csvContent = "Barcode,Column,Old Value,New Value\n"; // CSV header

        changeLog.forEach(change => {
            const row = [
                `"${change.barcode}"`, 
                `"${change.column}"`, 
                `"${change.old_value}"`, 
                `"${change.new_value}"`
            ];
            csvContent += row.join(",") + "\n";
        });

        // Create a Blob from the CSV content
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create a download link and trigger the download
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "change_log.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Release the object URL after the download
        URL.revokeObjectURL(url);
    }

    function exportData(type) {
        $.ajax({
            url: '/export',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                data: window.data,
                type: type
            }),
            success: function(response) {
                const blob = new Blob([response], { type: response.type });
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = type === 'excel' ? 'exported_file.xlsx' : 'exported_file.csv';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            error: function(xhr, status, error) {
                alert('Failed to export the file. Please try again.');
            }
        });
    }

    $('#prev-row').click(function () {
        loadRow(currentRow - 1);
    });

    $('#next-row').click(function () {
        loadRow(currentRow + 1);
    });

    $('#prev-image').click(function () {
        loadImage(currentImageIndex - 1);
    });

    $('#next-image').click(function () {
        loadImage(currentImageIndex + 1);
    });

    $('#save-changes').click(function () {
        saveChanges();
    });

    $('#download-excel').click(function (e) {
        e.preventDefault();
        exportData('excel');
    });

    $('#download-csv').click(function (e) {
        e.preventDefault();
        exportData('csv');
    });

    $('#download-changes').click(function () {
        downloadChangeLog();
    });

    // Load the first row initially (row index 0)
    loadRow(0);
});
