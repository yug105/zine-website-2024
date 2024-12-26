module.exports = {
  purge: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      animation: {
        navbar: "navbar 0.5s ease-out",
        blob: "blob 7s infinite",
      },
      spacing: {
        18: "4.4rem",
        22: "5.8rem",
        26: "6.6rem",
        38: "9.8rem",
        110: "20rem",
        115: "21rem",
        120: "30rem",
        130: "40rem",
        140: "45rem",
        145: "48rem",
        150: "60rem",
        160: "67.5rem",
      },
      keyframes: {
        navbar: {
          "0%": { transform: "translateX(20%)" },
          "100%": { transform: "translateX(0%)" },
        },
        blob: {
          "0%": {
            transform:
              "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform:
              "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform:
              "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform:
              "tranlate(0px, 0px) scale(1)",
          },
        },
      },
      colors: {
        'blue1': '#1386cc',
        'blue2': '#0C72B0F2',
        gray: {
          1000: "#0B0B0B",
          1100: "#252525",
          1200: "#121212",
          1300: "#808080",
          1400: "#353535",
          1500: "#FFFFFF",
        },
        lblue: "#C2FFF4",
      },
      fontFamily: {
        righteous: ["Righteous", "cursive"],
        rajdhani: ["Rajdhani", "sans-serif"],
        nunito: ["Nunito", "sans-serif"],
        roboto: ["Roboto", "monospace"],
        poppins: ["Poppins", "sans-serif"],
      },
      boxShadow: {
        button_custom:
          "4px 4px 8px rgba(255, 255, 255, 0.25)",
        nav_custom:
          "30px 0px 30px 30px rgba(255, 255, 255, 0.25)",
        login_custom:
          "0px 0px 10px 5px rgba(0, 0, 0, 0.25);",
      },
      backgroundImage: {
        "footer-bg":
          "url('../images/footer_11zon.webp')",
        "body-bg":
          "url('../images/bg_11zon.webp')",
        "bg-a1":
          "url('../images/project/a1_11zon.webp')",
        "bg-a2":
          "url('../images/project/a2_11zon.webp')",
        "bg-a3":
          "url('../images/project/a3_11zon.webp')",
        "bg-a4":
          "url('../images/project/a4_11zon.webp')",
        "bg-a5":
          "url('../images/project/a5_11zon.webp')",
        "bg-a6":
          "url('../images/project/a6_11zon.webp')",
        "bg-a7":
          "url('../images/project/a7_11zon.webp')",
        "bg-a8":
          "url('../images/project/a8_11zon.webp')",
        "bg-a9":
          "url('../images/project/a9_11zon.webp')",
        "bg-a10":
          "url('../images/project/a10_11zon.webp')",
        "bg-a11":
          "url('../images/project/a11_11zon.webp')",
        "bg-a12":
          "url('../images/project/a12_11zon.webp')",
        "bg-a13":
          "url('../images/project/a13_11zon.webp')",
        "bg-a14":
          "url('../images/project/a14_11zon.webp')",
        "bg-alumni": "url('../images/team.jpg')",
        "bg-team": "url('../images/alumni.jpg')",
        "about-bg":
          "url('../images/aboutbg_11zon.webp')",
        "blog-bg":
          "url('../images/blog/blog.jpg')",
        "ee-bg":
          "url('../images/blog/bee/ee.jpg')",
        "algo-bg":
          "url('../images/blog/algo/5.webp')",
        "banner-bg":
          "url('../images/banner-bg.webp')",
        "bg-project":
          "url('../images/project/project.jpeg')",
      },
      fontSize: {
        base: ["50px", "75px"],
        normal: ["16px", "24px"],
      },

      screens: {
        custom: "900px",
        xsm: "300px",
      },
    },
  },
  variants: {
    extend: {
      display: ["group-hover"],
    },
  },
  plugins: [
    
  ],
};
