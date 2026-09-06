console.log("APP.JS LOADED");

const SUPABASE_URL = "https://jkucxovuslrrszxtcqch.supabase.co";

const SUPABASE_KEY = "sb_publishable_XvRbXvtkXOstDP9Au6_paQ_v8bBTfmP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const BASE_SEARCH_API_URL =
  "https://neodb.social/api/catalog/search";


let currentCategory = "book";


const searchInput =
  document.getElementById("searchInput");

const searchButton =
  document.getElementById("searchButton");

const resultsContainer =
  document.getElementById("results");

const statusElement =
  document.getElementById("status");

const categoryButtons =
  document.querySelectorAll(".category");


/*
 * Category Switch
 */

categoryButtons.forEach(button => {

  button.addEventListener("click", () => {

    categoryButtons.forEach(btn =>
      btn.classList.remove("active")
    );

    button.classList.add("active");

    currentCategory =
      button.dataset.category;

    resultsContainer.innerHTML = "";

    statusElement.textContent =
      currentCategory === "book"
        ? "Search for a book."
        : "Search for a movie or TV show.";

  });

});


/*
 * Search Button
 */

searchButton.addEventListener(
  "click",
  runSearch
);


/*
 * Enter Search
 */

searchInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      runSearch();
    }

  }
);


/*
 * Search
 */

async function runSearch() {

  const keyword =
    searchInput.value.trim();


  if (!keyword) {

    statusElement.textContent =
      "Please enter a keyword.";

    return;

  }


  statusElement.textContent =
    "Searching NeoDB...";


  resultsContainer.innerHTML =
    "";


  searchButton.disabled =
    true;


  try {

    const url =
      `${BASE_SEARCH_API_URL}?query=${encodeURIComponent(keyword)}&c=${currentCategory}`;


    const response =
      await fetch(url);


    if (!response.ok) {

      throw new Error(
        `Request failed: ${response.status}`
      );

    }


    const data =
      await response.json();


    const results =
      data?.data || [];


    if (results.length === 0) {

      statusElement.textContent =
        "No results found.";

      return;

    }


    statusElement.textContent =
      `${results.length} results found.`;


    renderResults(
      results,
      currentCategory
    );


  } catch (error) {

    console.error(error);


    statusElement.textContent =
      "Something went wrong. Please try again.";


    resultsContainer.innerHTML =
      `
        <p class="error-message">
          ${error.message}
        </p>
      `;


  } finally {

    searchButton.disabled =
      false;

  }

}


/*
 * Render Results
 */

function renderResults(
  results,
  category
) {

  resultsContainer.innerHTML =
    results.map(item => {


      const isBook =
        category === "book";


      /*
       * Meta
       */

      let primaryMeta =
        "";


      let secondaryMeta =
        "";


      if (isBook) {

        primaryMeta =
          (item.author || [])
            .join(", ");


        secondaryMeta =
          item.pub_house
            ? `Published by ${item.pub_house}`
            : "";


      } else {

        primaryMeta =
          (item.director || [])
            .join(", ");


        const actors =
          (item.actor || [])
            .slice(0, 3)
            .map(actor =>
              typeof actor === "object"
                ? actor.name
                : actor
            )
            .join(", ");


        secondaryMeta =
          actors
            ? `Starring ${actors}`
            : "";

      }


      /*
       * Cover
       */

      const cover =
        item.cover_image_url
          ? `
            <img
              src="${escapeHtml(item.cover_image_url)}"
              alt="${escapeHtml(item.title || "")}"
              class="cover-img"
              loading="lazy"
            >
          `
          : `
            <div class="empty-cover">
              No Cover
            </div>
          `;


      return `

        <article class="result-item">

          ${cover}


          <div class="result-info">


            <h2 class="result-title">
              ${escapeHtml(
                item.title || "Unknown"
              )}
            </h2>


            ${
              primaryMeta
                ? `
                  <div class="meta">
                    ${escapeHtml(primaryMeta)}
                  </div>
                `
                : ""
            }


            ${
              secondaryMeta
                ? `
                  <div class="meta">
                    ${escapeHtml(secondaryMeta)}
                  </div>
                `
                : ""
            }


            ${
              item.description
                ? `
                  <div class="description">
                    ${escapeHtml(item.description)}
                  </div>
                `
                : ""
            }


          </div>

        </article>

      `;


    }).join("");

}


/*
 * Basic HTML Escape
 */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}

async function testSupabase() {
  console.log("TEST FUNCTION STARTING");

  try {
    const { data, error } = await supabaseClient
      .from("media_items")
      .insert({
        neodb_uuid: "test-item-001",
        category: "book",
        title: "Supabase Test Book"
      })
      .select();

    console.log("Supabase response:", {
      data,
      error
    });

  } catch (error) {
    console.error(
      "Unexpected error:",
      error
    );
  }
}

testSupabase();