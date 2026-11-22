export const THEME_STORAGE_KEY = "theme";
export const DARK_CLASS = "dark";

// 첫 페인트 전에 <html>에 dark 클래스를 붙여 라이트→다크 깜빡임(FOUC)을 막는 인라인 스크립트.
// 저장된 값이 없으면 OS 설정(prefers-color-scheme)을 초기값으로 사용한다.
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("${DARK_CLASS}",d);}catch(e){}})();`;
