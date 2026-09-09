console.log("APP.JS LOADED");

const SUPABASE_URL = "https://jkucxovuslrrszxtcqch.supabase.co";

const SUPABASE_KEY = "sb_publishable_XvRbXvtkXOstDP9Au6_paQ_v8bBTfmP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const authSection =
  document.getElementById("authSection");

const appContent =
  document.getElementById("appContent");

const searchPage =
  document.getElementById("searchPage");

const libraryPage =
  document.getElementById("libraryPage");

const libraryResults =
  document.getElementById("libraryResults");

const authStatus =
  document.getElementById("authStatus");

const emailInput =
  document.getElementById("emailInput");

const passwordInput =
  document.getElementById("passwordInput");

const signInButton =
  document.getElementById("signInButton");

const authMessage =
  document.getElementById("authMessage");

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

    /*
     * 1. Get current user
     */

    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth
        .getSession();


    if (!session) {

      throw new Error(
        "Please sign in first."
      );

    }


    const userId =
      session.user.id;


    /*
     * 2. Check whether media item exists
     */

    const {
      data: existingMediaItem,
      error: mediaCheckError
    } =
      await supabaseClient
        .from("media_items")
        .select("id")
        .eq(
          "neodb_uuid",
          item.uuid
        )
        .maybeSingle();


    if (mediaCheckError) {

      throw mediaCheckError;

    }


    let mediaItemId;


    /*
     * 3. Use existing media item
     */

    if (existingMediaItem) {

      console.log(
        "Media item already exists:",
        existingMediaItem.id
      );


      mediaItemId =
        existingMediaItem.id;


    } else {

      /*
       * 4. Insert media item
       */

      const {
        data: newMediaItem,
        error: mediaInsertError
      } =
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

            cover_image_url:
              item.cover_image_url,

            description:
              item.description,

            neodb_rating:
              item.rating,

            neodb_rating_count:
              item.rating_count,

            tags:
              item.tags,

            director:
              item.director,

            playwright:
              item.playwright,

            actor:
              item.actor,

            genre:
              item.genre,

            language:
              item.language,

            raw_data:
              item
          })
          .select()
          .single();


      if (mediaInsertError) {

        throw mediaInsertError;

      }


      console.log(
        "Media item inserted:",
        newMediaItem
      );


      mediaItemId =
        newMediaItem.id;

    }


    /*
     * 5. Check whether already in user's library
     */

    const {
      data: existingLibraryItem,
      error: libraryCheckError
    } =
      await supabaseClient
        .from("library_items")
        .select("id")
        .eq(
          "user_id",
          userId
        )
        .eq(
          "media_item_id",
          mediaItemId
        )
        .maybeSingle();


    if (libraryCheckError) {

      throw libraryCheckError;

    }


    /*
     * 6. Already in library
     */

    if (existingLibraryItem) {

      console.log(
        "Item already exists in library."
      );


      button.textContent =
        "Already saved";

      button.classList.add(
        "saved"
      );

      return;

    }


    /*
     * 7. Add to library
     */

    const {
      data: newLibraryItem,
      error: libraryInsertError
    } =
      await supabaseClient
        .from("library_items")
        .insert({
          user_id:
            userId,

          media_item_id:
            mediaItemId,

          status:
            "wishlist"
        })
        .select()
        .single();


    if (libraryInsertError) {

      throw libraryInsertError;

    }


    console.log(
      "Added to library:",
      newLibraryItem
    );


    /*
     * 8. Update button
     */

    button.textContent =
      "Saved";

    button.classList.add(
      "saved"
    );


  } catch (error) {

    console.error(
      "Save failed:",
      error
    );


    button.disabled =
      false;

    button.textContent =
      "Save to Library";

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

async function signIn() {

  const email =
    emailInput.value.trim();

  const password =
    passwordInput.value;


  if (!email || !password) {

    authMessage.textContent =
      "Please enter your email and password.";

    return;

  }


  signInButton.disabled =
    true;


  authMessage.textContent =
    "Signing in...";


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });


    if (error) {

      throw error;

    }


    console.log(
      "SIGNED IN:",
      data
    );


    passwordInput.value =
      "";


    await updateAuthUI();


  } catch (error) {

    console.error(
      "Sign in failed:",
      error
    );


    authMessage.textContent =
      error.message;

  } finally {

    signInButton.disabled =
      false;

  }

}

async function updateAuthUI() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();


  if (session) {

    console.log(
      "Current user:",
      session.user
    );


    authSection.hidden =
      true;


    appContent.hidden =
      false;


    authStatus.innerHTML =
  `
    <div class="signed-in-user">
      ${escapeHtml(
        session.user.email
      )}
    </div>

    <button
      id="searchPageButton"
      class="library-button"
    >
      Search
    </button>

    <button
      id="libraryButton"
      class="library-button"
    >
      Library
    </button>

    <button
      id="signOutButton"
      class="sign-out-button"
    >
      Sign out
    </button>
  `;


    document
      .getElementById("signOutButton")
      .addEventListener(
        "click",
        signOut
      );

    document
  .getElementById("searchPageButton")
  .addEventListener(
    "click",
    showSearchPage
  );


    document
      .getElementById("libraryButton")
      .addEventListener(
        "click",
        showLibraryPage
      );


  } else {

    authSection.hidden =
      false;


    appContent.hidden =
      true;


    authStatus.innerHTML =
      "";

  }

}

async function signOut() {

  const {
    error
  } =
    await supabaseClient.auth
      .signOut();


  if (error) {

    console.error(
      "Sign out failed:",
      error
    );

    return;

  }


  await updateAuthUI();

}

signInButton.addEventListener(
  "click",
  signIn
);
passwordInput.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {

      signIn();

    }

  }
);

updateAuthUI();

async function loadLibrary() {

  console.log("Loading library...");

  statusElement.textContent =
    "Loading your library...";

  libraryResults.innerHTML =
  "";

  try {

    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth.getSession();


    if (!session) {

      throw new Error(
        "Please sign in first."
      );

    }


    const {
      data,
      error
    } =
      await supabaseClient
        .from("library_items")
        .select(`
          id,
          status,
          added_at,
          media_items (
            id,
            neodb_uuid,
            category,
            title,
            cover_image_url,
            description
          )
        `)
        .eq(
          "user_id",
          session.user.id
        )
        .order(
          "added_at",
          {
            ascending: false
          }
        );


    if (error) {

      throw error;

    }


    console.log(
      "Library items:",
      data
    );


    if (!data || data.length === 0) {

      statusElement.textContent =
        "Your library is empty.";

      return;

    }


    statusElement.textContent =
      `${data.length} items in your library.`;


    libraryResults.innerHTML =
  data.map(libraryItem => {

        const item =
          libraryItem.media_items;


        if (!item) {
          return "";
        }


        const cover =
          item.cover_image_url
            ? `
              <img
                src="${escapeHtml(
                  item.cover_image_url
                )}"
                alt="${escapeHtml(
                  item.title || ""
                )}"
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

              <div class="meta">
                ${escapeHtml(
                  item.category || ""
                )}
              </div>

              <div class="meta">
                Status:
                ${escapeHtml(
                  libraryItem.status || ""
                )}
              </div>

            </div>

          </article>
        `;

      }).join("");


  } catch (error) {

    console.error(
      "Load library failed:",
      error
    );

    statusElement.textContent =
      "Failed to load your library.";

    libraryResults.innerHTML =
      `
        <p class="error-message">
          ${escapeHtml(
            error.message
          )}
        </p>
      `;

  }

}

function showSearchPage() {

  searchPage.hidden = false;

  libraryPage.hidden = true;

}


async function showLibraryPage() {

  searchPage.hidden = true;

  libraryPage.hidden = false;

  await loadLibrary();

}