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

function renderResults(results, category) {

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


      /*
       * Save button
       */

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


            <button
              class="save-button"
              data-uuid="${escapeHtml(item.uuid)}"
            >
              Save to Library
            </button>


          </div>

        </article>

      `;

    }).join("");

async function saveMediaItem(item, button) {

  console.log("Saving item:", item);

  button.disabled = true;
  button.textContent = "Saving...";

  try {

    // 1. Check whether it already exists
    const { data: existingItem, error: checkError } =
      await supabaseClient
        .from("media_items")
        .select("id")
        .eq("neodb_uuid", item.uuid)
        .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    // 2. Already exists
    if (existingItem) {

      console.log("Item already exists.");

      button.textContent = "Already saved";
      button.classList.add("saved");

      return;
    }

    // 3. Insert only when it does not exist
    const { data, error } =
      await supabaseClient
        .from("media_items")
        .insert({
          neodb_uuid: item.uuid,

          neodb_id: item.id,

          neodb_url: item.url,

          api_url: item.api_url,

          category: item.category,

          title: item.title,

          display_title: item.display_title,

          orig_title: item.orig_title,

          cover_image_url: item.cover_image_url,

          description: item.description,

          neodb_rating: item.rating,

          neodb_rating_count: item.rating_count,

          tags: item.tags,

          director: item.director,

          playwright: item.playwright,

          actor: item.actor,

          genre: item.genre,

          language: item.language,

          raw_data: item
        })
        .select();

    if (error) {
      throw error;
    }

    console.log("Saved successfully:", data);

    button.textContent = "Saved";
    button.classList.add("saved");

  } catch (error) {

    console.error("Save failed:", error);

    button.disabled = false;
    button.textContent = "Save";

  }

}
  /*
   * Save button events
   */

  document
    .querySelectorAll(".save-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const uuid =
            button.dataset.uuid;


          const item =
            results.find(
              result =>
                result.uuid === uuid
            );


          if (item) {

            saveMediaItem(
              item,
              button
            );

          }

        }
      );

    });

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

