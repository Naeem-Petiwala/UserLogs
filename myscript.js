// iOS Logs
document.getElementById("iOSLogs").addEventListener("click", function () {
    logsDownload("iOS", "Live");
});

// iOS Logs GLUAT ALMCP2
document.getElementById("iOSLocal").addEventListener("click", function () {
    logsDownload("iOS", "/Local");
});

// Android Logs
document.getElementById("AndroidLogs").addEventListener("click", function () {
    logsDownload("Android", "Live");
});
// Android Logs GLUAT ALMCP2
document.getElementById("AndroidLocal").addEventListener("click", function () {
    logsDownload("Android", "Local");
});

// API Logs
document.getElementById("APILogs").addEventListener("click", function () {
    logsDownload("API", "Live");
});
// APILocal
document.getElementById("APILocal").addEventListener("click", function () {
    logsDownload("API", "Local");
});
// All Logs
document.getElementById("AllLogs").addEventListener("click", function () {
    logsDownload("AllLogs", "Live");
});
// UPW Logs
document.getElementById("UPWLogs").addEventListener("click", function () {
    logsDownload("UPW", "Live");
});
// UPW Local Logs
document.getElementById("UPWLocal").addEventListener("click", function () {
    logsDownload("UPW", "Local");
});
// Next Page
document.getElementById("ImpBtn").addEventListener("click", function () {
    // alert("Coming Soon");
    dynamicUrl = `Important Links/importantLinks.html`
    window.open(dynamicUrl, "_blank");
});
// Reporting Object
document.getElementById("REPOBJ").addEventListener("click",function() {
    objectDownload();
});

function objectDownload() {
    const clientID      = encodeURIComponent(document.getElementById("param1").value);
    const filePath      = encodeURIComponent(document.getElementById("param3").value);
    const baseURL       = "https://cirriusindiacentralstor.blob.core.windows.net/";
    const appendURL     = "/ReportObj/Success/";
    let dynamicUrl      = `${baseURL}${clientID}${appendURL}${filePath}`
    window.open(dynamicUrl, "_blank");
}

function logsDownload(deviceType, linkType) {
    const param1Value = encodeURIComponent(document.getElementById("param1").value);
    const param2Value = formatDateForURL(document.getElementById("param2").value);
    const param3Value = encodeURIComponent(document.getElementById("param3").value);
    const param4Value = formatDateForAPIURL(document.getElementById("param2").value);
    const param5Value = encodeURIComponent(document.getElementById("localDrop").value);

    const liveURL       = "https://cirriusindiacentralstor.blob.core.windows.net"
    const uatURL        = "https://storagegpworker.blob.core.windows.net"
    const preURL        = "https://storageaccountuat2.blob.core.windows.net"
    const localURL      = "https://cirrdevstore.blob.core.windows.net"
    const sunIntURL     = "https://blobstoragegm.blob.core.windows.net"
    const connectURL    = "images/txnsgp/devicelog"
    const apiUrl        = "apilogs"
    const upwURL        = "UPW"
    const androidURL    = "android"
    const txtURL        = ".txt"

    let dynamicUrl = ""
    if (deviceType === "iOS") {

        if (linkType === "Live") {

            if (param1Value === "sunem1" || param1Value === "sunem3") {

                dynamicUrl = `${sunIntURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`

            } else {

                dynamicUrl = `${liveURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`

            }

        } else {

            if (param5Value === "storageGP") {

                dynamicUrl = `${uatURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`

            } else if (param5Value === "local5.0") {

                dynamicUrl = `${localURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`
                window.open(dynamicUrl, "_blank");
                return
            } else if (param5Value == "preENV") {
                dynamicUrl = `${preURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`
            }
        }
    } else if (deviceType === "Android") {

        if (linkType === "Live") {
            if (linkType === "Live") {

                if (param1Value === "sunem1" || param1Value === "sunem3") {

                    dynamicUrl = `${sunIntURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`

                } else {
                    dynamicUrl = `${liveURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`
                }
            }
        } else {
            if (param5Value === "storageGP") {

                dynamicUrl = `${uatURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`

            } else if (param5Value === "local5.0") {

                dynamicUrl = `${localURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`

                window.open(dynamicUrl, "_blank");
                return

            } else if (param5Value == "preENV") {
                dynamicUrl = `${preURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`
            }
        }
    } else if (deviceType === "API") {
        if (linkType === "Live") {
            dynamicUrl = `${liveURL}/${apiUrl}/${param1Value.toUpperCase()}/${param3Value}_${param4Value}${txtURL}`;
        } else if (param5Value == "preENV") { 
            dynamicUrl = `${preURL}/${apiUrl}/${param1Value.toUpperCase()}/${param3Value}_${param4Value}${txtURL}`;
        } else {
            dynamicUrl = `${uatURL}/${apiUrl}/${param1Value.toUpperCase()}/${param3Value}_${param4Value}${txtURL}`;
        }
    } else if (deviceType === "UPW") {
        if (linkType === "Live") {
            dynamicUrl = `${liveURL}/${apiUrl}/${upwURL}/${param1Value.toUpperCase()}_${param4Value}_CommonLogs${txtURL}`;

        } else if (param5Value == "preENV") { 
            dynamicUrl = `${preURL}/${apiUrl}/${upwURL}/${param1Value.toUpperCase()}_${param4Value}_CommonLogs${txtURL}`;
        } else {
            dynamicUrl = `${uatURL}/${apiUrl}/${upwURL}/${param1Value.toUpperCase()}_${param4Value}_CommonLogs${txtURL}`;
        }
    } else {

        let iOSUrl = ''
        let androidUrl = ''
        let apiUrl = ''
        if (param1Value === "sunem1" || param1Value === "sunem3") {
            iOSUrl = `${sunIntURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`
            androidUrl = `${sunIntURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`

            apiUrl = `${liveURL}/${apiUrl}/${param1Value.toUpperCase()}/${param3Value}_${param4Value}${txtURL}`
        } else {
            iOSUrl = `${liveURL}/${param1Value}/${connectURL}/${param2Value}/${param3Value}${txtURL}`
            androidUrl = `${liveURL}/${param1Value}/${connectURL}/${androidURL}/${param2Value}/${param3Value}${txtURL}`
            apiUrl = `${liveURL}/${apiUrl}/${param1Value.toUpperCase()}/${param3Value}_${param4Value}${txtURL}`
        }

        if (param1Value === "sunem1" || param1Value === "sunem3") {
            window.open(iOSUrl, "_blank");
            window.open(androidUrl, "_blank");
            window.open(apiUrl, "_blank");
        } else {
            fetch(dynamicUrl).then(response => {
                if (!response.ok) {
                    showAlert(`Logs for ${param3Value}_${param1Value}_${param2Value} not found`);
                } else {
                    window.open(iOSUrl, "_blank");
                    window.open(androidUrl, "_blank");
                    window.open(apiUrl, "_blank");
                }
            });
        }
        return;
    }

    if (param1Value === "sunem1" || param1Value === "sunem3") {
        window.open(dynamicUrl, "_blank");
    } else {
        fetch(dynamicUrl).then(response => {
            if (!response.ok) {
                showAlert(`Logs for ${param3Value}_${param1Value}_${param2Value} not found`);
            } else {
                window.open(dynamicUrl, "_blank");
            }
        });
    }
}

function showAlert(message) {
    var alertBox = document.getElementById('alert');
    alertBox.textContent = message;
    alertBox.style.display = 'block';

    // Hide the alert after 3 seconds (3000 milliseconds)
    setTimeout(function () {
        alertBox.style.display = 'none';
    }, 3000);
}

// Func to Formate Live/Local Logs Date
function formatDateForURL(dateString) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
}

// Func to Formate API Logs Date
function formatDateForAPIURL(dateString) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[0]}${parts[1]}${parts[2]}`;
    }
    return dateString;
}

// Showing Todays Date Automatically
var today = new Date().toISOString().split('T')[0];
document.getElementById('param2').value = today;

// Date Picker Arrow Script
const datePicker = document.getElementById('param2');
const backArrow = document.getElementById('backArrow');
const forwardArrow = document.getElementById('forwardArrow');
backArrow.addEventListener('click', () => {
    const selectedDate = new Date(datePicker.value);
    selectedDate.setDate(selectedDate.getDate() - 1);
    datePicker.value = selectedDate.toISOString().split('T')[0];
});
forwardArrow.addEventListener('click', () => {
    const selectedDate = new Date(datePicker.value);
    selectedDate.setDate(selectedDate.getDate() + 1);
    datePicker.value = selectedDate.toISOString().split('T')[0];
});

// Option Arrow Script
const optionsSelect = document.getElementById('param1');
const downArrow = document.getElementById('downArrow');
const upArrow = document.getElementById('upArrow');
downArrow.addEventListener('click', () => {
    const selectedIndex = optionsSelect.selectedIndex;
    if (selectedIndex === 0) {
        optionsSelect.selectedIndex = optionsSelect.options.length - 1;
    } else {
        optionsSelect.selectedIndex = selectedIndex - 1;
    }
});
upArrow.addEventListener('click', () => {
    const selectedIndex = optionsSelect.selectedIndex;
    if (selectedIndex === optionsSelect.options.length - 1) {
        optionsSelect.selectedIndex = 0;
    } else {
        optionsSelect.selectedIndex = selectedIndex + 1;
    }
});

// Get the checkbox and dropdown elements
var checkbox = document.getElementById('myCheckbox');
var mainDropDown = document.getElementById('param1');
var localDropDown = document.getElementById('localDrop');
var dropdownContainer = document.getElementById('dropdownContainer');

var LiveArray = [
    { "value": "sun", "text": "SUN PHARMA (sun)" },
    { "value": "glenmark", "text": "GLENMARK (glenmark)" },
    { "value": "usv", "text": "USV (usv)" },
    { "value": "sunem2", "text": "SUN EMERGING (sunem2)" },
    { "value": "hul", "text": "HUL (hul)" },
    { "value": "cipla", "text": "CIPLA (cipla)" },
    { "value": "cadila", "text": "CADILA (cadila)" },
    { "value": "apl", "text": "AUROBINDO (apl)" },
    { "value": "drl", "text": "DR. REDDY (drl)" },
    { "value": "alcp2", "text": "ALEMBIC (alcp2)" },
    { "value": "jbcpl", "text": "JBCPL (jbcpl)" },
    { "value": "chc", "text": "SUN CHC (chc)" },
    { "value": "danone", "text": "DANONE (danone)" },
    { "value": "gmem", "text": "GLEM (gmem)" },
    { "value": "biotics", "text": "BIOTICS (biotics)" },
    { "value": "inzpera", "text": "INZPERA HEALTH (inzpera)" },
    { "value": "ajanta", "text": "AJANTA PHARMA (ajanta)" },
    { "value": "pghl", "text": "PNG (pghl)" },
    { "value": "arcp2", "text": "ARISTO PHARMA (arcp2)" },
    { "value": "aurogen", "text": "AURO INDONESIA (aurogen)" },
    { "value": "metr", "text": "METROPOLIS (metr)" },
    { "value": "sdpl", "text": "SOFTDEAL PRIVATE (sdpl)" },
    { "value": "cipi", "text": "CIPLA INTERNATIONAL (cipi)" },
    { "value": "bayer", "text": "BAYER (bayer)" },
    { "value": "higen", "text": "HIGEN (higen)" },
    { "value": "thyrocare", "text": "THYROCARE (thyrocare)" },
    { "value": "cadvet", "text": "VETNOVA (cadvet)" },
    { "value": "mega", "text": "MEGACARE (mega)" },
    { "value": "sunem1", "text": "SUNRD (sunem1)" },
    { "value": "sunem3", "text": "SUN RUSSIA OTC (sunem3)" },
    { "value": "cpc", "text": "CPC DIAGNOSTIC (cpc)" },
    { "value": "enbcl", "text": "EMERCHEMIE (enbcl)" },
    { "value": "zintl", "text": "ZINTL (zintl)" },
    { "value": "zydi", "text": "ZYDUS (zydi)" },
    { "value": "vapt", "text": "VAPT (vapt)" },
    { "value": "hem", "text": "HEMAS (hem)" },
    { "value": "eisai", "text": "EISAI (eisai)" },
    { "value": "elanco", "text": "ELANCO (elanco)" },
    { "value": "kenvue", "text": "KENVUE (kenvue)" }
];

var LocalArray = [
    { "value": "hulpre", "text": "HULPRE (hulpre)" },
    { "value": "suncp3", "text": "SUNCP3 (suncp3)" },
    { "value": "gmlo", "text": "GMLO (gmlo)" },
    { "value": "sunuat", "text": "SUNUAT (sunuat)" },
    { "value": "sunind", "text": "SUNDEV (sunind)" },
    { "value": "cipq", "text": "CIPQ (cipq)" },
    { "value": "jbcpl", "text": "JBCPL LOCAL (jbcpl)" },
    { "value": "usv", "text": "USV LOCAL (usv)" },
    { "value": "chcdev", "text": "CHCDEV (chcdev)" },
    { "value": "bayer", "text": "BAYER LOCAL (bayer)" },
    { "value": "almcp2", "text": "ALEMBIC LOCAL (almcp2)" },
    { "value": "gluat", "text": "GLUAT (gluat)" },
    { "value": "huluat", "text": "HULUAT (huluat)" },
    { "value": "ciplauat", "text": "CIPLAUAT (ciplauat)" },
    { "value": "chc1", "text": "CHC1 (chc1)" },
    { "value": "sunemuat", "text": "SUNEMUAT (sunemuat)" },
    { "value": "sunrdev", "text": "SUNRDEV (sunrdev)" },
    { "value": "ajdev", "text": "AJDEV (ajdev)" },
    { "value": "cp3", "text": "CP3 (cp3)" },
    { "value": "dcp3", "text": "DCP3 (dcp3)" },
    { "value": "cad", "text": "CADILA LOCAL (cad)" },
    { "value": "sunem3uat", "text": "SUNEM3UAT (sunem3uat)" },
    { "value": "uldev", "text": "ULDEV (uldev)" },
    { "value": "drlpre", "text": "DRLPRE (drlpre)" },
    { "value": "uathul", "text": "UATHUL (uathul)" },
    { "value": "uatdrl", "text": "UATDRL (uatdrl)" },
    { "value": "ciplapre", "text": "CIPLAPRE (ciplapre)" },
    { "value": "uatcipla", "text": "UATCIPLA (uatcipla)" },
    { "value": "uatjbcpl", "text": "UATJBCPL (uatjbcpl)" },
    { "value": "jbcplpre", "text": "JBCPLPRE (jbcplpre)" },
    { "value": "uatglmrk", "text": "UATGLMRK (uatglmrk)" },
    { "value": "glmrkpre", "text": "GLMRKPRE (glmrkpre)" },
    { "value": "ajantapre", "text": "AJANTAPRE (ajantapre)" },
    { "value": "uatajanta", "text": "UATAJANTA (uatajanta)" },
];

// Method to fill Main Dropdown
function updateMainDropdown(options) {
    mainDropDown.innerHTML = '';
    for (var i = 0; i < options.length; i++) {
        var option = document.createElement('option');
        option.value = options[i].value;
        option.text = options[i].text;
        mainDropDown.add(option);
    }
}
function hideLiveBtn() {
    iOSLogs.classList.add('hidden')
    AndroidLogs.classList.add('hidden')
    APILogs.classList.add('hidden')
    APILocal.classList.remove('hidden')
    UPWLocal.classList.remove('hidden')
    AllLogs.classList.add('hidden')
    REPOBJ.classList.add('hidden')
    iOSLocal.classList.remove('hidden')
    AndroidLocal.classList.remove('hidden')
    UPWLogs.classList.add('hidden')
}

function hideLocalBtn() {
    iOSLogs.classList.remove('hidden')
    AndroidLogs.classList.remove('hidden')
    APILogs.classList.remove('hidden')
    APILocal.classList.add('hidden')
    UPWLocal.classList.add('hidden')
    AllLogs.classList.remove('hidden')
    iOSLocal.classList.add('hidden')
    AndroidLocal.classList.add('hidden')
    UPWLogs.classList.remove('hidden')
    REPOBJ.classList.remove('hidden')
}

// Checkbox state
checkbox.addEventListener('change', function () {
    dropdownContainer.classList.toggle('hidden', checkbox.checked);
    if (checkbox.checked) {
        updateMainDropdown(LiveArray); // When Checked
        hideLocalBtn();
    } else {
        updateMainDropdown(LocalArray); // When Unchecked
        updateDropdown(LocalLinks); // Local Link Option
        hideLiveBtn();
    }
});

var LocalLinks = [
    { value: 'local5.0', text: 'LOCAL 5.0' },
    { value: 'storageGP', text: 'STORAGE GP' },
    { value: 'preENV', text: 'PRE ENV' },
    { value: 'qcENV', text: 'QC ENV' }
];

function updateDropdown(options) {
    localDropDown.innerHTML = '';
    for (var i = 0; i < options.length; i++) {
        var option = document.createElement('option');
        option.value = options[i].value;
        option.text = options[i].text;
        localDropDown.add(option);
    }
}
updateMainDropdown(LiveArray); // After Refresh
updateDropdown(LocalLinks); // After Refresh
hideLocalBtn(); // After Refresh

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('keydown', function (event) {
        // Check if the pressed key is an arrow key
        if (event.key === 'ArrowLeft') {
            const selectedDate = new Date(datePicker.value);
            selectedDate.setDate(selectedDate.getDate() - 1);
            datePicker.value = selectedDate.toISOString().split('T')[0];
        } else if (event.key === 'ArrowRight') {
            const selectedDate = new Date(datePicker.value);
            selectedDate.setDate(selectedDate.getDate() + 1);
            datePicker.value = selectedDate.toISOString().split('T')[0];
        } else if (event.key === 'ArrowDown') {
            const selectedIndex = optionsSelect.selectedIndex;
            if (selectedIndex === optionsSelect.options.length - 1) {
                optionsSelect.selectedIndex = 0;
            } else {
                optionsSelect.selectedIndex = selectedIndex + 1;
            }
        } else if (event.key === 'ArrowUp') {
            const selectedIndex = optionsSelect.selectedIndex;
            if (selectedIndex === 0) {
                optionsSelect.selectedIndex = optionsSelect.options.length - 1;
            } else {
                optionsSelect.selectedIndex = selectedIndex - 1;
            }
        }
    });
});