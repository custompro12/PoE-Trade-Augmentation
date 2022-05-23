// ==UserScript==
// @name        PoE Trade - Import Item
// @namespace   Violentmonkey Scripts
// @match       https://www.pathofexile.com/trade/search/*
// @grant       none
// @version     1.0
// @author      coldtoiletseat
// @description Adds various features to the official pathofexile.com/trade website
// @downloadURL https://github.com/custompro12/PoE-Trade-Augmentation/raw/master/PoE-Trade-Augmentation.user.js
// ==/UserScript==

// Select the node that will be observed for mutations
const targetNode = document.body;

// Options for the observer (which mutations to observe)
const config = {
    attributes: false,
    childList: true,
    subtree: true,
};

let called = false;

// Callback function to execute when mutations are observed
const callback = function (mutationsList, observer) {
    for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
            if (!called && document.querySelector('[placeholder="Search Items..."]')) {
                called = true;
                observer.disconnect();

                onAppLoad();
            }
        }
    }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, config);

function onAppLoad() {
    const container = document.createElement('div');
    const textArea = document.createElement('textArea');

    container.style.position = 'absolute';
    container.style.left = 0;
    container.style.top = 0;
    container.style.zIndex = 99999;
    textArea.style.width = '50px';
    textArea.style.height = '50px';

    textArea.onchange = value => searchItem(value.target.value);

    container.appendChild(textArea);
    document.body.appendChild(container);
}

function searchItem(item) {
    const usePseudoResists = true;

    item = item.split(/\r?\n/).map(line => line.trim());

    const itemName = item[0];
    const baseType = item[1];
    implicitIndex = item.findIndex(line => line.includes('Implicits: '));
    implicitCount = parseInt(item[implicitIndex].split(' ')[1]);
    indexOfExplicits = implicitIndex + implicitCount + 1;
    const explicits = item
        .slice(indexOfExplicits)
        .filter(mod => !mod.startsWith('{crafted}'))
        .map(explicit => explicit.replace(/([\+-]?\d+(.\d+)?)/g, '#'));
    const crafts = item
        .slice(indexOfExplicits)
        .filter(mod => mod.startsWith('{crafted}'))
        .map(mod => mod.replace(/([\+-]?\d+(.\d+)?)/g, '#'));

    const stats = JSON.parse(localStorage.getItem('lscache-tradestats'));
    // console.log(stats)
    console.log({ explicits, crafts });

    explicits.forEach((explicit, index) => {
        let modType = 'Explicit';

        if (
            (explicit.includes('to maximum Energy Shield') || explicit.includes('% increased Energy Shield')) &&
            !baseType.includes('Ring') &&
            !baseType.includes('Amulet')
        ) {
            explicit = explicit.concat(' \\(Local\\)');
        }

        if (usePseudoResists && explicit.match(/^#% to ((Fire)|(Cold)|(Lightning)|(Chaos)) Resistance$/)) {
            modType = 'Pseudo';
            explicit = '\\+#% total Elemental Resistance';
        }
        console.log(`[${modType}] ${explicit}`);

        const stat = stats
            .find(sections => sections.label === modType)
            .entries.find(entry => entry.text.match('^' + explicit + '$', 'i'))?.text;

        if (stat) {
            // console.log('Searching for affix value:', stat);

            const inputEl = document.querySelector('[placeholder="+ Add Stat Filter"]');
            setTimeout(() => {
                inputEl.value = stat;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));

                queueMicrotask(() => {
                    const statEls = Array.from(
                        document.querySelector('.search-advanced-pane.brown .multiselect__content').children
                        // );
                    ).filter(statEl => statEl.innerText.trim().startsWith(modType.toLowerCase()));
                    console.dir(statEls.map(el => el.innerText.trim()));

                    console.log(stat);
                    // const regex = '^' + modType + ' ' + stat.trim().replace(/\\/g, "\\") + '$';
                    const regex = '^' + modType + ' ' + stat.trim().replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&') + '$';
                    const statEl = statEls.find(el =>
                        el.innerText
                            .trim()
                            // .includes(modType.toLowerCase() + ' ' + stat.trim())
                            .match(new RegExp(regex, 'i'))
                    )?.firstChild;

                    if (statEl) {
                        console.log(statEl);
                        statEl.click();
                    } else {
                        console.log('Could not find a stat element for:', modType + ' ' + stat.trim());
                    }
                });
            });
        } else {
            console.log('Could not find a stat for:', explicit);
        }
    });
}
