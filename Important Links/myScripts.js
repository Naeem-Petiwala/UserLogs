function highlightText(element, searchText) {
    if (!searchText) return;

    const row = element.closest('.row');
    const cellsToHighlight = [1, 3];

    cellsToHighlight.forEach(column => {
        const cells = row.querySelectorAll(`td:nth-child(${column})`);
        cells.forEach(cell => {
            const text = cell.textContent;
            const regex = new RegExp(searchText, 'gi');
            const highlightedText = text.replace(regex, match => `<mark>${match}</mark>`);
            cell.innerHTML = highlightedText;
        });
    });
}

function clearHighlight() {
    const highlightedElements = document.querySelectorAll('mark');
    highlightedElements.forEach(element => {
        element.outerHTML = element.innerHTML;
    });
}

function toggleRow(element) {
    const content = element.nextElementSibling;
    const allContents = document.querySelectorAll('.content');
    allContents.forEach((item) => {
        if (item !== content) {
            item.style.display = 'none';
        }
    });
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

// Search functionality
document.getElementById('searchBar').addEventListener('input', function () {
    const query = this.value.toLowerCase();
    const rows = document.querySelectorAll('.row');
    let anyMatch = false;
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let rowMatch = false;
        cells.forEach(cell => {
            if (cell.textContent.toLowerCase().includes(query)) {
                rowMatch = true;
                anyMatch = true;
                highlightText(cell, query);
            }
        });
        if (rowMatch) {
            row.style.display = '';
            row.querySelector('.content').style.display = 'block';
        } else {
            row.style.display = 'none';
        }
    });
    if (!query) {
        rows.forEach(row => {
            row.style.display = '';
            row.querySelector('.content').style.display = 'none';
        });
    }
});

// Clear search functionality
document.getElementById('clearButton').addEventListener('click', function () {
    document.getElementById('searchBar').value = '';
    clearHighlight(); // Clear highlighted text
    const rows = document.querySelectorAll('.row');
    rows.forEach(row => {
        row.style.display = '';
        row.querySelector('.content').style.display = 'none';
    });
});

// Links to Open
const linksToOpen = document.querySelectorAll('.linkToOpen');
const openLinksDict = {
    releaseNotes: 'https://cirrius-my.sharepoint.com/:x:/p/vikas_yadav/EUZY748-dK9NqdWM8NoAdFwBhwS2t5y03B2ncGWBc71l7w?e=ni0kwE',
    dailyTask: 'https://cirrius.sharepoint.com/:x:/g/EQH-LB-Z3HBEk2CcGXHWMvIBKiBk9JwmkCGhVnk8pQvJwA?e=m7rTys',
    azureDev: 'https://cirrius01.visualstudio.com/CP2',
    newApp: 'https://xd.adobe.com/view/2b6e3ff2-dba3-410a-8a9d-b4790b02af90-7e3d/?fullscreen',
    testUsers: 'https://gist.github.com/Naeem-Petiwala/4885d412a1b7cf751107497902b558af',
    userDB: 'sample.com',
    phyziiDatabase: 'https://docs.google.com/spreadsheets/d/1P1nBlQpzFE6EExv28l7CW8G5bDFsaZqEKtchrd64QCI/edit?usp=sharing',

    localReset: 'http://dev.cirrius.in/phyziicrm/',
    uatReset: 'https://phyziiuat.cirrius.in',
    liveReset: 'https://phyzii.cirrius.in',

    crashlytics: 'https://console.firebase.google.com/u/2/project/phyzii-e8407/overview',
    postman: 'https://web.postman.co/workspaces',
    textToLink: 'https://www.htmlstrip.com/text-to-link-converter',
    sharepoint: 'https://cirrius.sharepoint.com/',
    devglan: 'https://www.devglan.com/online-tools/aes-encryption-decryption',
    jwt: 'https://jwt.io/',
    textCompare: 'https://text-compare.com/',
    jsonViewer: 'https://jsonviewer.stack.hu/',
    zoho: 'https://accounts.zoho.com/signin?servicename=AaaServer&serviceurl=https%3A%2F%2Faccounts.zoho.com%2Fhome',
    greythr: 'https://cirrius.greythr.com/uas/portal/auth/login?login_challenge=e489142aeff744a0a02fe198643a62b3',
};

linksToOpen.forEach(function (button) {
    button.addEventListener('click', function () {
        var linkToOpen = openLinksDict[button.dataset.value];
        window.open(linkToOpen, '_blank');
    });
});

// Links to Copy
const copyBtn = document.querySelectorAll('.copyButton');
const copyLinkDict = {
    iPadConfig: 'https://cirriusindiacentralstor.blob.core.windows.net/clientid/cp2urls/cp2liveurlversion5https_v4.zip',
    iPhonConfig: 'https://cirriusindiacentralstor.blob.core.windows.net/clientid/cp2urls/cp2liveurlversion5.zip',
    uatConfig: 'https://storagegpworker.blob.core.windows.net/clientid/cp2urls/cp2urlversion4_5_0.zip',
    localConfig: 'https://cirriusapilogscript.blob.core.windows.net/clientid/cp2urls/cp2urlversion4_5_0.zip',
    ajdevConfig: 'https://storagegpworker.blob.core.windows.net/clientid/cp2urls/cp2urlversion4_4_1.zip',
    iOSText: 'itms-services://?action=download-manifest&amp;url=',

    LiveLogs: 'https://cirriusindiacentralstor.blob.core.windows.net/CLIENTID/images/txnsgp/devicelog/DD-MM-YYYY/REPCODE.txt',
    uatLogs: 'https://storagegpworker.blob.core.windows.net/CLIENTID/images/txnsgp/devicelog/DD-MM-YYYY/REPCODE.txt',
    localLogs: 'https://cirrdevstore.blob.core.windows.net/CLIENTID/images/txnsgp/devicelog/DD-MM-YYYY/REPCODE.txt',
    liveAPILogs: 'https://cirriusindiacentralstor.blob.core.windows.net/apilogs/CLIENTID/REPCODE_YYYYMMDD.txt',
    liveUPWLogs: 'https://cirriusindiacentralstor.blob.core.windows.net/apilogs/UPW/CLIENTID_YYYYMMDD_CommonLogs.txt',
    localAPILogs: 'https://storagegpworker.blob.core.windows.net/apilogs/CLIENTID/REPCODE_YYYYMMDD.txt',
    localUPWLogs: 'https://storagegpworker.blob.core.windows.net/apilogs/UPW/CLIENTID_YYYYMMDD_CommonLogs.txt',
    liveSUNRDLogs: 'https://blobstoragegm.blob.core.windows.net/sunem1/images/txnsgp/devicelog/DD-MM-YYYY/REPCODE.txt',
};

copyBtn.forEach(button => {
    button.addEventListener('click', () => {
        const valueToCopy = copyLinkDict[button.dataset.value];
        navigator.clipboard.writeText(valueToCopy)
            .then(() => {
                alert('Link copied to clipboard!');
            })
            .catch(err => {
                console.error('Failed to copy: ', err);
            });
    });
});

// Back Button
document.getElementById("backButton").addEventListener("click", function () {
    window.location.href = '../index.html';
});