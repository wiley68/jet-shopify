/**
 * Jet Product – стилове и действия за бутона/лизинга
 */
(function () {
  // Първоначална вноска (в центове, по подразбиране 0)
  let jet_parva = 0;

  /**
   * Изчислява броя вноски според цената
   * @param {number} productPrice - Цената в центове
   * @param {number} jetMinVnoski - Минимална цена за използване на default вноски (по подразбиране 125)
   * @param {number} jetVnoskiDefault - Брой вноски по подразбиране
   * @param {number} parva - Първоначална вноска в центове (по подразбиране 0)
   * @returns {number} Брой вноски
   */
  function calculateVnoski(productPrice, jetMinVnoski, jetVnoskiDefault, parva) {
    // Изчисляваме реалната сума за лизинговите вноски: jet_total_credit_price = jet_priceall - jet_parva
    const jet_total_credit_price = productPrice - (parva || 0);

    // Конвертираме цената от центове в евро
    const priceInEuro = jet_total_credit_price / 100.0;
    const minVnoski = jetMinVnoski || 125;
    const defaultVnoski = jetVnoskiDefault || 12;

    if (priceInEuro < minVnoski) {
      return 9;
    } else {
      return defaultVnoski;
    }
  }

  /**
   * Изчислява месечната вноска
   * @param {number} jetTotalCreditPrice - Общата сума за кредит в центове
   * @param {number} jetVnoski - Брой вноски
   * @param {number} jetPurcent - Процент
   * @returns {number} Месечна вноска в центове
   */
  function calculateJetVnoska(jetTotalCreditPrice, jetVnoski, jetPurcent) {
    // Конвертираме от центове в евро за изчисленията
    const totalCreditPriceEuro = jetTotalCreditPrice / 100.0;

    // Формула: jet_vnoska = (jet_total_credit_price / jet_vnoski) * (1 + (jet_vnoski * jet_purcent) / 100)
    const jetVnoskaEuro = (totalCreditPriceEuro / jetVnoski) * (1 + (jetVnoski * jetPurcent) / 100);

    // Конвертираме обратно в центове и закръгляме до 2 десетични знака
    return Math.round(jetVnoskaEuro * 100);
  }

  /**
   * Форматира сума в центове като евро с 2 десетични знака
   * @param {number} cents - Сума в центове
   * @returns {string} Форматирана сума (напр. "125.50")
   */
  function formatEuro(cents) {
    return (cents / 100.0).toFixed(2);
  }

  /**
   * Обновява текста за вноските на страницата
   * @param {number} productPrice - Цената в центове
   * @param {number} parva - Първоначална вноска в центове (опционално, използва текущата стойност ако не е зададена)
   */
  function updateVnoskaText(productPrice, parva) {
    const container = document.getElementById('jet-product-button-container');
    if (!container) return;

    const jetMinVnoski = parseFloat(container.dataset.jetMinVnoski || '125') || 125;
    const jetVnoskiDefault = parseFloat(container.dataset.jetVnoskiDefault || '12') || 12;
    const currentParva = parva !== undefined ? parva : jet_parva;

    // Изчисляваме реалната сума за кредит
    const jetTotalCreditPrice = productPrice - currentParva;

    // Изчисляваме броя вноски
    const vnoski = calculateVnoski(productPrice, jetMinVnoski, jetVnoskiDefault, currentParva);

    // Обновяваме елементите за редовен лизинг (използва jet_purcent)
    const regularElements = document.querySelectorAll('.jet-vnoska-regular');
    regularElements.forEach(function (element) {
      if (element instanceof HTMLElement) {
        const jetPurcent = parseFloat(element.dataset.jetPurcent || '0') || 0;
        const jetVnoskaCents = calculateJetVnoska(jetTotalCreditPrice, vnoski, jetPurcent);
        const jetVnoskaFormatted = formatEuro(jetVnoskaCents);
        element.textContent = vnoski + ' x ' + jetVnoskaFormatted + ' €';
        element.dataset.vnoski = String(vnoski);
        element.dataset.jetVnoska = String(jetVnoskaCents);
      }
    });

    // Обновяваме елементите за кредитна карта (използва jet_purcent_card)
    const cardElements = document.querySelectorAll('.jet-vnoska-card');
    cardElements.forEach(function (element) {
      if (element instanceof HTMLElement) {
        const jetPurcentCard = parseFloat(element.dataset.jetPurcentCard || '0') || 0;
        const jetVnoskaCents = calculateJetVnoska(jetTotalCreditPrice, vnoski, jetPurcentCard);
        const jetVnoskaFormatted = formatEuro(jetVnoskaCents);
        element.textContent = vnoski + ' x ' + jetVnoskaFormatted + ' €';
        element.dataset.vnoski = String(vnoski);
        element.dataset.jetVnoska = String(jetVnoskaCents);
      }
    });
  }

  /**
   * Задава първоначалната вноска и обновява изчисленията
   * @param {number} parva - Първоначална вноска в центове
   */
  function setJetParva(parva) {
    jet_parva = parva || 0;
    const container = document.getElementById('jet-product-button-container');
    if (container) {
      const productPrice = parseFloat(container.dataset.productPrice || '0');
      if (productPrice) {
        updateVnoskaText(productPrice, jet_parva);
      }
    }
  }

  /**
   * Извлича цената на варианта от различни източници
   * @returns {number} Цената в центове или 0 ако не може да се намери
   */
  function getVariantPrice() {
    // Метод 1: От JSON скрипта на варианта (най-надеждно)
    const variantScripts = document.querySelectorAll('form script[type="application/json"]');
    for (let i = 0; i < variantScripts.length; i++) {
      const script = variantScripts[i];
      if (!script) continue;
      try {
        const scriptText = script.textContent;
        if (!scriptText) continue;
        const variantData = JSON.parse(scriptText);
        if (variantData && variantData.price && variantData.price > 0) {
          return variantData.price; // Цената вече е в центове
        }
      } catch (e) {
        // Игнорираме грешки при парсване
      }
    }

    // Метод 2: От data-variant-id на избрания radio бутон
    const checkedRadio = document.querySelector('input[type="radio"][name*="variant"]:checked, input[type="radio"][name*="Color"]:checked, input[type="radio"][name*="Size"]:checked');
    if (checkedRadio && checkedRadio instanceof HTMLInputElement) {
      const variantId = checkedRadio.getAttribute('data-variant-id');
      if (variantId) {
        // Търсим JSON скрипта с този variant ID
        for (let i = 0; i < variantScripts.length; i++) {
          const script = variantScripts[i];
          if (!script) continue;
          try {
            const scriptText = script.textContent;
            if (!scriptText) continue;
            const variantData = JSON.parse(scriptText);
            if (variantData && variantData.id && variantData.price && String(variantData.id) === String(variantId)) {
              return variantData.price;
            }
          } catch (e) {
            // Игнорираме грешки при парсване
          }
        }
      }
    }

    // Метод 3: От DOM елемента с цената
    const priceElement = document.querySelector('product-price .price, .price');
    if (priceElement) {
      const priceText = priceElement.textContent || '';
      // Премахваме всичко освен числа и точка/запетая
      let priceMatch = priceText.replace(/[^\d,.]/g, '');

      // Обработваме формат като "€1.000,00" (точка за хиляди, запетая за десетични)
      if (priceMatch.includes(',')) {
        priceMatch = priceMatch.replace(/\./g, '').replace(',', '.');
      } else if (priceMatch.includes('.')) {
        const parts = priceMatch.split('.');
        const secondPart = parts[1];
        if (!(parts.length === 2 && secondPart && secondPart.length <= 2)) {
          priceMatch = priceMatch.replace(/\./g, '');
        }
      }

      const priceValue = parseFloat(priceMatch);
      if (!isNaN(priceValue) && priceValue > 0) {
        return Math.round(priceValue * 100); // Конвертираме от евро в центове
      }
    }

    return 0;
  }

  /**
   * Обновява цената и вноските при промяна на вариант
   */
  function updatePriceFromVariant() {
    const container = document.getElementById('jet-product-button-container');
    if (!container) return;

    const oldPrice = parseFloat(container.dataset.productPrice || '0');

    // Изчакваме малко за да Shopify обнови DOM-а
    setTimeout(function () {
      const newPrice = getVariantPrice();

      if (newPrice > 0 && newPrice !== oldPrice) {
        // Обновяваме цената в контейнера
        container.dataset.productPrice = String(newPrice);

        // Обновяваме вноските
        updateVnoskaText(newPrice, jet_parva);
      }
    }, 300); // Изчакваме 300ms за да Shopify обнови цената в DOM
  }

  /**
   * Отваря popup прозореца за лизинг
   */
  function openJetPopup() {
    const overlay = document.getElementById('jet-popup-overlay');
    if (!overlay) return;

    const container = document.getElementById('jet-product-button-container');
    if (!container) return;

    // Вземаме актуалната цена (включително опциите и количеството)
    let productPrice = getVariantPrice();

    // Ако не можем да вземем цената от варианта, използваме тази от контейнера
    if (!productPrice || productPrice === 0) {
      productPrice = parseFloat(container.dataset.productPrice || '0');
    }

    // Вземаме количеството от формата (ако има)
    const quantityInput = document.querySelector('input[name="quantity"], input[type="number"][name*="quantity"]');
    let quantity = 1;
    if (quantityInput && quantityInput instanceof HTMLInputElement) {
      quantity = parseInt(quantityInput.value) || 1;
    }

    // Умножаваме цената по количеството
    productPrice = productPrice * quantity;

    const jetPurcent = parseFloat(container.dataset.jetPurcent || '0');
    const currentParva = jet_parva || 0;
    const vnoskaElement = document.querySelector('.jet-vnoska-regular');
    const vnoskiFromElement = vnoskaElement instanceof HTMLElement ? vnoskaElement.dataset.vnoski : null;
    const currentVnoski = parseInt(vnoskiFromElement || container.dataset.jetVnoskiDefault || '12');

    // Обновяваме стойностите в popup-а
    updatePopupValues(productPrice, currentParva, currentVnoski, jetPurcent);

    overlay.style.display = 'flex';
  }

  /**
   * Затваря popup прозореца
   */
  function closeJetPopup() {
    const overlay = document.getElementById('jet-popup-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Обновява стойностите в popup прозореца
   * @param {number} productPrice - Цената в центове
   * @param {number} parva - Първоначална вноска в центове
   * @param {number} vnoski - Брой вноски
   * @param {number} jetPurcent - Процент
   */
  function updatePopupValues(productPrice, parva, vnoski, jetPurcent) {
    // Конвертираме от центове в евро
    const productPriceEuro = productPrice / 100.0;
    const parvaEuro = parva / 100.0;
    const totalCreditPriceEuro = productPriceEuro - parvaEuro;
    const totalCreditPriceCents = Math.round(totalCreditPriceEuro * 100);

    // Изчисляваме месечната вноска
    const monthlyVnoskaCents = calculateJetVnoska(totalCreditPriceCents, vnoski, jetPurcent);
    const monthlyVnoskaEuro = monthlyVnoskaCents / 100.0;

    // Изчисляваме общата стойност на плащанията
    const totalPaymentsEuro = vnoski * monthlyVnoskaEuro;

    // Обновяваме полетата
    const parvaInput = document.getElementById('jet-parva-input');
    if (parvaInput && parvaInput instanceof HTMLInputElement) {
      parvaInput.value = String(Math.round(parvaEuro));
    }

    const productPriceInput = document.getElementById('jet-product-price-input');
    if (productPriceInput && productPriceInput instanceof HTMLInputElement) {
      productPriceInput.value = productPriceEuro.toFixed(2) + ' €';
    }

    const vnoskiSelect = document.getElementById('jet-vnoski-select');
    if (vnoskiSelect && vnoskiSelect instanceof HTMLSelectElement) {
      vnoskiSelect.value = String(vnoski);
    }

    const totalCreditInput = document.getElementById('jet-total-credit-input');
    if (totalCreditInput && totalCreditInput instanceof HTMLInputElement) {
      totalCreditInput.value = totalCreditPriceEuro.toFixed(2) + ' €';
    }

    const monthlyVnoskaInput = document.getElementById('jet-monthly-vnoska-input');
    if (monthlyVnoskaInput && monthlyVnoskaInput instanceof HTMLInputElement) {
      monthlyVnoskaInput.value = monthlyVnoskaEuro.toFixed(2) + ' €';
    }

    const totalPaymentsInput = document.getElementById('jet-total-payments-input');
    if (totalPaymentsInput && totalPaymentsInput instanceof HTMLInputElement) {
      totalPaymentsInput.value = totalPaymentsEuro.toFixed(2) + ' €';
    }
  }

  /**
   * Преизчислява стойностите в popup-а
   */
  function recalculatePopup() {
    const container = document.getElementById('jet-product-button-container');
    if (!container) return;

    const parvaInput = document.getElementById('jet-parva-input');
    const vnoskiSelect = document.getElementById('jet-vnoski-select');

    if (!parvaInput || !vnoskiSelect) return;

    const productPrice = parseFloat(container.dataset.productPrice || '0');
    const jetPurcent = parseFloat(container.dataset.jetPurcent || '0');

    // Вземаме стойностите от input полетата
    const parvaEuro = parseFloat(parvaInput instanceof HTMLInputElement ? parvaInput.value : '0') || 0;
    const parvaCents = Math.round(parvaEuro * 100);
    const vnoski = parseInt(vnoskiSelect instanceof HTMLSelectElement ? vnoskiSelect.value : '12') || 12;

    // Обновяваме глобалната променлива
    jet_parva = parvaCents;

    // Обновяваме стойностите в popup-а
    updatePopupValues(productPrice, parvaCents, vnoski, jetPurcent);

    // Обновяваме и текста под бутона
    updateVnoskaText(productPrice, parvaCents);
  }

  /**
   * Инициализира popup функционалността
   */
  function initPopup() {
    const overlay = document.getElementById('jet-popup-overlay');
    if (!overlay) return;

    // Затваряне при клик на overlay
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        closeJetPopup();
      }
    });

    // Бутон "Преизчисли"
    const recalculateBtn = document.getElementById('jet-recalculate-btn');
    if (recalculateBtn) {
      recalculateBtn.addEventListener('click', recalculatePopup);
    }

    // Промяна на броя вноски
    const vnoskiSelect = document.getElementById('jet-vnoski-select');
    if (vnoskiSelect) {
      vnoskiSelect.addEventListener('change', recalculatePopup);
    }

    // Бутон "Откажи"
    const cancelBtn = document.getElementById('jet-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeJetPopup);
    }

    // Бутон "Добави в количката"
    const addToCartBtn = document.getElementById('jet-add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', function () {
        const termsCheckbox = document.getElementById('jet-terms-checkbox');
        const gdprCheckbox = document.getElementById('jet-gdpr-checkbox');
        const termsChecked = termsCheckbox instanceof HTMLInputElement ? termsCheckbox.checked : false;
        const gdprChecked = gdprCheckbox instanceof HTMLInputElement ? gdprCheckbox.checked : false;

        if (!termsChecked || !gdprChecked) {
          alert('Моля, попълнете всички задължителни полета за съгласие.');
          return;
        }

        // Тук може да се добави логика за добавяне в количката
        closeJetPopup();
      });
    }

    // Бутон "Купи на кредит"
    const buyOnCreditBtn = document.getElementById('jet-buy-on-credit-btn');
    if (buyOnCreditBtn) {
      buyOnCreditBtn.addEventListener('click', function () {
        const termsCheckbox = document.getElementById('jet-terms-checkbox');
        const gdprCheckbox = document.getElementById('jet-gdpr-checkbox');
        const termsChecked = termsCheckbox instanceof HTMLInputElement ? termsCheckbox.checked : false;
        const gdprChecked = gdprCheckbox instanceof HTMLInputElement ? gdprCheckbox.checked : false;

        if (!termsChecked || !gdprChecked) {
          alert('Моля, попълнете всички задължителни полета за съгласие.');
          return;
        }

        // Тук може да се добави логика за изпращане на заявка за кредит
        closeJetPopup();
      });
    }
  }

  function init() {
    const container = document.getElementById('jet-product-button-container');
    if (!container) return;

    // Инициализираме jet_parva от data атрибута (ако има такъв)
    jet_parva = parseFloat(container.dataset.jetParva || '0') || 0;

    // Инициализираме изчислението с текущата цена
    const productPrice = parseFloat(container.dataset.productPrice || '0');
    if (productPrice) {
      updateVnoskaText(productPrice, jet_parva);
    }

    container.addEventListener('click', function () {
      openJetPopup();
    });

    // Инициализираме popup функционалността
    initPopup();

    // Прихващаме промяна на опциите (варианти)
    // Използваме делегиране на събития за да работи и с динамично добавени елементи
    document.addEventListener('change', function (event) {
      const target = event.target;

      // Проверяваме дали е промяна на вариант (radio бутони за опции)
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        const name = target.name || '';
        // Проверяваме дали е опция (Color, Size, или съдържа variant)
        if (name.includes('Color') || name.includes('Size') || name.includes('variant') || name.includes('option')) {
          updatePriceFromVariant();
          // Ако popup-ът е отворен, обновяваме го
          const overlay = document.getElementById('jet-popup-overlay');
          if (overlay && overlay.style.display === 'flex') {
            setTimeout(function () {
              openJetPopup();
            }, 300);
          }
        }
      }

      // Проверяваме дали е промяна на количеството
      if (target instanceof HTMLInputElement && (target.name === 'quantity' || target.name.includes('quantity'))) {
        const overlay = document.getElementById('jet-popup-overlay');
        if (overlay && overlay.style.display === 'flex') {
          setTimeout(function () {
            openJetPopup();
          }, 100);
        }
      }
    }, true); // Използваме capture phase за по-надеждно прихващане

    // Прихващаме и click събития за radio бутони (за по-бърза реакция)
    document.addEventListener('click', function (event) {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        const name = target.name || '';
        if (name.includes('Color') || name.includes('Size') || name.includes('variant') || name.includes('option')) {
          // Изчакваме малко за да се обнови checked състоянието
          setTimeout(function () {
            updatePriceFromVariant();
            // Ако popup-ът е отворен, обновяваме го
            const overlay = document.getElementById('jet-popup-overlay');
            if (overlay && overlay.style.display === 'flex') {
              setTimeout(function () {
                openJetPopup();
              }, 200);
            }
          }, 100);
        }
      }
    }, true);

    // Експортираме функциите глобално за използване при динамична промяна на цената или първоначалната вноска
    const jetProduct = {};
    jetProduct.calculateVnoski = calculateVnoski;
    jetProduct.calculateJetVnoska = calculateJetVnoska;
    jetProduct.formatEuro = formatEuro;
    jetProduct.updateVnoskaText = updateVnoskaText;
    jetProduct.setJetParva = setJetParva;
    jetProduct.getJetParva = function () {
      return jet_parva;
    };
    jetProduct.updatePriceFromVariant = updatePriceFromVariant;
    // @ts-ignore
    window.jetProduct = jetProduct;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
