import en from './en.json';
import zh from './zh.json';

// 简单的国际化实现，根据需要可以替换为react-i18next等库
const i18n = {
  locale: 'zh', // 默认语言
  messages: {
    en,
    zh
  },
  t(key) {
    return this.messages[this.locale][key] || key;
  },
  setLocale(locale) {
    if (this.messages[locale]) {
      this.locale = locale;
    }
  }
};

export { i18n };

