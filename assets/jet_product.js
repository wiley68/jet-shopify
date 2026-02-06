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
    setTimeout(function() {
      const newPrice = getVariantPrice();
      
      if (newPrice > 0 && newPrice !== oldPrice) {
        // Обновяваме цената в контейнера
        container.dataset.productPrice = String(newPrice);
        
        // Обновяваме вноските
        updateVnoskaText(newPrice, jet_parva);
      }
    }, 300); // Изчакваме 300ms за да Shopify обнови цената в DOM
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
      // Тук може да се добави действие при клик (напр. отваряне на форма за лизинг)
    });

    // Прихващаме промяна на опциите (варианти)
    // Използваме делегиране на събития за да работи и с динамично добавени елементи
    document.addEventListener('change', function(event) {
      const target = event.target;
      
      // Проверяваме дали е промяна на вариант (radio бутони за опции)
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        const name = target.name || '';
        // Проверяваме дали е опция (Color, Size, или съдържа variant)
        if (name.includes('Color') || name.includes('Size') || name.includes('variant') || name.includes('option')) {
          updatePriceFromVariant();
        }
      }
    }, true); // Използваме capture phase за по-надеждно прихващане

    // Прихващаме и click събития за radio бутони (за по-бърза реакция)
    document.addEventListener('click', function(event) {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'radio') {
        const name = target.name || '';
        if (name.includes('Color') || name.includes('Size') || name.includes('variant') || name.includes('option')) {
          // Изчакваме малко за да се обнови checked състоянието
          setTimeout(function() {
            updatePriceFromVariant();
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
