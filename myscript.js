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
// All Logs
document.getElementById("AllLogs").addEventListener("click", function () {
    logsDownload("AllLogs", "Live");
});
// UPW Logs
document.getElementById("UPWLogs").addEventListener("click", function () {
    logsDownload("UPW", "Live");
});
// Next Page
document.getElementById("ImpBtn").addEventListener("click", function () {
    dynamicUrl = `importantLinks.html`
    window.location.href = dynamicUrl;
    // window.open(dynamicUrl, "_blank");
});

function logsDownload(deviceType, linkType) {
    const param1Value = encodeURIComponent(document.getElementById("param1").value);
    const param2Value = formatDateForURL(document.getElementById("param2").value);
    const param3Value = encodeURIComponent(document.getElementById("param3").value);
    const param4Value = formatDateForAPIURL(document.getElementById("param2").value);
    const param5Value = encodeURIComponent(document.getElementById("localDrop").value);
    let dynamicUrl = ""
    if (deviceType === "iOS") {

        if (linkType === "Live") {

            dynamicUrl = `https://cirriusindiacentralstor.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/${param2Value}/${param3Value}.txt`

        } else {

            if (param5Value === "storageGP") {

                dynamicUrl = `https://storagegpworker.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/${param2Value}/${param3Value}.txt`

            } else if (param5Value === "local5.0") {

                dynamicUrl = `https://cirrdevstore.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/${param2Value}/${param3Value}.txt`

            }
        }
    } else if (deviceType === "Android") {

        if (linkType === "Live") {

            dynamicUrl = `https://cirriusindiacentralstor.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/android/${param2Value}/${param3Value}.txt`

        } else {
            if (param5Value === "storageGP") {

                dynamicUrl = `https://storagegpworker.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/android/${param2Value}/${param3Value}.txt`

            } else if (param5Value === "local5.0") {

                dynamicUrl = `https://cirrdevstore.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/android/${param2Value}/${param3Value}.txt`

            }
        }
    } else if (deviceType === "API") {
        if (linkType === "Live") {
            dynamicUrl = `https://cirriusindiacentralstor.blob.core.windows.net/apilogs/${param1Value.toUpperCase()}/${param3Value}_${param4Value}.txt`;
        }
    } else if (deviceType === "UPW") {
        dynamicUrl = `https://cirriusindiacentralstor.blob.core.windows.net/apilogs/UPW/${param1Value.toUpperCase()}_${param4Value}_CommonLogs.txt`;
    } else {

        const iOSUrl = `https://cirriusindiacentralstor.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/${param2Value}/${param3Value}.txt`;
        const androidUrl = `https://cirriusindiacentralstor.blob.core.windows.net/${param1Value}/images/txnsgp/devicelog/android/${param2Value}/${param3Value}.txt`;
        const apiUrl = `https://cirriusindiacentralstor.blob.core.windows.net/apilogs/${param1Value.toUpperCase()}/${param3Value}_${param4Value}.txt`;

        window.open(iOSUrl, "_blank");
        window.open(androidUrl, "_blank");
        window.open(apiUrl, "_blank");
        return;
    }

    window.open(dynamicUrl, "_blank");

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
    { value: 'sun', text: 'SUN PHARMA' },
    { value: 'usv', text: 'USV' },
    { value: 'sunem2', text: 'SUN EMERGING' },
    { value: 'hul', text: 'HUL' },
    { value: 'cipla', text: 'CIPLA' },
    { value: 'glenmark', text: 'GLENMARK' },
    { value: 'cadila', text: 'CADILA' },
    { value: 'apl', text: 'AUROBINDO' },
    { value: 'drl', text: 'DR. REDDY' },
    { value: 'alcp2', text: 'ALEMBIC' },
    { value: 'jbcpl', text: 'JBCPL' },
    { value: 'chc', text: 'SUN CHC' },
    { value: 'danone', text: 'DANONE' },
    { value: 'glmrk', text: 'GLEM' },
    { value: 'biotics', text: 'BIOTICS' },
    { value: 'inzpera', text: 'INZPERA HEALTH' },
    { value: 'ajanta', text: 'AJANTA PHARMA' },
    { value: 'pghl', text: 'PNG' },
    { value: 'arcp2', text: 'ARISTO PHARMA' },
    { value: 'aurogen', text: 'AURO INDONESIA' },
    { value: 'metr', text: 'METROPOLIS' },
    { value: 'sdpl', text: 'SOFTDEAL PRIVATE' },
    { value: 'cipi', text: 'CIPLA INTERNATIONAL' },
    { value: 'mega', text: 'MEGA' },
    { value: 'bayer', text: 'BAYER' },
    { value: 'higen', text: 'HIGEN' },
    { value: 'thyrocare', text: 'THYROCARE' },
    { value: 'cadvet', text: 'VETNOVA' }
];

var LocalArray = [
    { value: 'gmlo', text: 'GMLO' },
    { value: 'cipq', text: 'CIPQ' },
    { value: 'almcp2', text: 'ALEMBIC LOCAL' },
    { value: 'gluat', text: 'GLUAT' }
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
    AllLogs.classList.add('hidden')
    iOSLocal.classList.remove('hidden')
    AndroidLocal.classList.remove('hidden')
    UPWLogs.classList.add('hidden')
}

function hideLocalBtn() {
    iOSLogs.classList.remove('hidden')
    AndroidLogs.classList.remove('hidden')
    APILogs.classList.remove('hidden')
    AllLogs.classList.remove('hidden')
    iOSLocal.classList.add('hidden')
    AndroidLocal.classList.add('hidden')
    UPWLogs.classList.remove('hidden')
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
    { value: 'storageGP', text: 'STORAGE GP' },
    { value: 'local5.0', text: 'LOCAL 5.0' }
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