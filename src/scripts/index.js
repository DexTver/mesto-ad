/*
  Файл index.js является точкой входа в наше приложение
  и только он должен содержать логику инициализации нашего приложения
  используя при этом импорты из других файлов

  Из index.js не допускается что то экспортировать
*/

import { createCardElement } from "./components/card.js";
import { openModalWindow, closeModalWindow, setCloseModalWindowEventListeners } from "./components/modal.js";
import { enableValidation, clearValidation } from "./components/validation.js";
import { getUserInfo, getCardList, setUserInfo, setUserAvatar, addCard, deleteCard, changeLikeCardStatus } from "./components/api.js";

const validationSettings = {
  formSelector: ".popup__form",
  inputSelector: ".popup__input",
  submitButtonSelector: ".popup__button",
  inactiveButtonClass: "popup__button_disabled",
  inputErrorClass: "popup__input_type_error",
  errorClass: "popup__error_visible",
};

// DOM узлы
const placesWrap = document.querySelector(".places__list");
const profileFormModalWindow = document.querySelector(".popup_type_edit");
const profileForm = profileFormModalWindow.querySelector(".popup__form");
const profileTitleInput = profileForm.querySelector(".popup__input_type_name");
const profileDescriptionInput = profileForm.querySelector(".popup__input_type_description");

const cardFormModalWindow = document.querySelector(".popup_type_new-card");
const cardForm = cardFormModalWindow.querySelector(".popup__form");
const cardNameInput = cardForm.querySelector(".popup__input_type_card-name");
const cardLinkInput = cardForm.querySelector(".popup__input_type_url");

const imageModalWindow = document.querySelector(".popup_type_image");
const imageElement = imageModalWindow.querySelector(".popup__image");
const imageCaption = imageModalWindow.querySelector(".popup__caption");

const infoModalWindow = document.querySelector(".popup_type_info");

const openProfileFormButton = document.querySelector(".profile__edit-button");
const openCardFormButton = document.querySelector(".profile__add-button");

const profileTitle = document.querySelector(".profile__title");
const profileDescription = document.querySelector(".profile__description");
const profileAvatar = document.querySelector(".profile__image");

const avatarFormModalWindow = document.querySelector(".popup_type_edit-avatar");
const avatarForm = avatarFormModalWindow.querySelector(".popup__form");
const avatarInput = avatarForm.querySelector(".popup__input");

const logo = document.querySelector(".header__logo");

let currentUserId;

const handlePreviewPicture = ({ name, link }) => {
  imageElement.src = link;
  imageElement.alt = name;
  imageCaption.textContent = name;
  openModalWindow(imageModalWindow);
};

const handleLikeCard = (likeButton, likeCountElement, cardId) => {
  const isLiked = likeButton.classList.contains("card__like-button_is-active");
  changeLikeCardStatus(cardId, isLiked)
    .then((updatedCard) => {
      likeButton.classList.toggle("card__like-button_is-active");
      likeCountElement.textContent = updatedCard.likes.length;
    })
    .catch((err) => {
      console.log(err);
    });
};

const handleDeleteCard = (cardElement, cardId) => {
  deleteCard(cardId)
    .then(() => {
      cardElement.remove();
    })
    .catch((err) => {
      console.log(err);
    });
};

const handleProfileFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = profileForm.querySelector(validationSettings.submitButtonSelector);
  const buttonOriginalText = submitButton.textContent;
  submitButton.textContent = "Сохранение...";
  setUserInfo({
    name: profileTitleInput.value,
    about: profileDescriptionInput.value,
  })
    .then((userData) => {
      profileTitle.textContent = userData.name;
      profileDescription.textContent = userData.about;
      closeModalWindow(profileFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      submitButton.textContent = buttonOriginalText;
    });
};

const handleAvatarFromSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = avatarForm.querySelector(validationSettings.submitButtonSelector);
  const buttonOriginalText = submitButton.textContent;
  submitButton.textContent = "Сохранение...";
  setUserAvatar({ avatar: avatarInput.value })
    .then((userData) => {
      profileAvatar.style.backgroundImage = `url(${userData.avatar})`;
      closeModalWindow(avatarFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      submitButton.textContent = buttonOriginalText;
    });
};

const handleCardFormSubmit = (evt) => {
  evt.preventDefault();
  const submitButton = cardForm.querySelector(validationSettings.submitButtonSelector);
  const buttonOriginalText = submitButton.textContent;
  submitButton.textContent = "Создание...";
  addCard({
    name: cardNameInput.value,
    link: cardLinkInput.value,
  })
    .then((cardData) => {
      placesWrap.prepend(
        createCardElement(cardData, currentUserId, {
          onPreviewPicture: handlePreviewPicture,
          onLikeCard: handleLikeCard,
          onDeleteCard: handleDeleteCard,
        })
      );
      closeModalWindow(cardFormModalWindow);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      submitButton.textContent = buttonOriginalText;
    });
};

const handleStatsModalOpen = () => {
  getCardList()
    .then((cards) => {
      const totalLikes = cards.reduce((sum, card) => sum + card.likes.length, 0);

      const userLikesMap = {};
      cards.forEach((card) => {
        card.likes.forEach((user) => {
          if (!userLikesMap[user._id]) {
            userLikesMap[user._id] = { name: user.name, count: 0 };
          }
          userLikesMap[user._id].count++;
        });
      });

      const totalUsers = Object.keys(userLikesMap).length;
      const userLikesArray = Object.values(userLikesMap).sort((a, b) => b.count - a.count);
      const champion = userLikesArray[0];
      const maxLikesFromOneUser = champion ? champion.count : 0;

      const sortedCards = [...cards].sort((a, b) => b.likes.length - a.likes.length);

      infoModalWindow.querySelector(".popup__title").textContent = "Статистика";

      const infoList = infoModalWindow.querySelector(".popup__info");
      infoList.innerHTML = "";

      const infoItemTemplate = document.getElementById("popup-info-definition-template");
      const statsData = [
        { term: "Всего пользователей", description: totalUsers },
        { term: "Всего лайков", description: totalLikes },
        { term: "Максимальное количество лайков от одного пользователя", description: maxLikesFromOneUser },
        { term: "Чемпион лайков", description: champion ? champion.name : "—" },
      ];

      statsData.forEach(({ term, description }) => {
        const infoItem = infoItemTemplate.content.querySelector(".popup__info-item").cloneNode(true);
        infoItem.querySelector(".popup__info-term").textContent = term;
        infoItem.querySelector(".popup__info-description").textContent = description;
        infoList.append(infoItem);
      });

      infoModalWindow.querySelector(".popup__text").textContent = "Популярные карточки";

      const popularCardsList = infoModalWindow.querySelector(".popup__list");
      popularCardsList.innerHTML = "";

      const listItemTemplate = document.getElementById("popup-info-user-preview-template");
      sortedCards.slice(0, 5).forEach((card) => {
        const listItem = listItemTemplate.content.querySelector(".popup__list-item").cloneNode(true);
        listItem.textContent = `${card.name} (${card.likes.length})`;
        popularCardsList.append(listItem);
      });

      openModalWindow(infoModalWindow);
    })
    .catch((err) => {
      console.log(err);
    });
};

// EventListeners
profileForm.addEventListener("submit", handleProfileFormSubmit);
cardForm.addEventListener("submit", handleCardFormSubmit);
avatarForm.addEventListener("submit", handleAvatarFromSubmit);

openProfileFormButton.addEventListener("click", () => {
  profileTitleInput.value = profileTitle.textContent;
  profileDescriptionInput.value = profileDescription.textContent;
  clearValidation(profileForm, validationSettings);
  openModalWindow(profileFormModalWindow);
});

profileAvatar.addEventListener("click", () => {
  avatarForm.reset();
  clearValidation(avatarForm, validationSettings);
  openModalWindow(avatarFormModalWindow);
});

openCardFormButton.addEventListener("click", () => {
  cardForm.reset();
  clearValidation(cardForm, validationSettings);
  openModalWindow(cardFormModalWindow);
});

logo.addEventListener("click", handleStatsModalOpen);

// настраиваем обработчики закрытия попапов
const allPopups = document.querySelectorAll(".popup");
allPopups.forEach((popup) => {
  setCloseModalWindowEventListeners(popup);
});

enableValidation(validationSettings);

Promise.all([getCardList(), getUserInfo()])
  .then(([cards, userData]) => {
    currentUserId = userData._id;
    profileTitle.textContent = userData.name;
    profileDescription.textContent = userData.about;
    profileAvatar.style.backgroundImage = `url(${userData.avatar})`;

    cards.forEach((cardData) => {
      placesWrap.append(
        createCardElement(cardData, currentUserId, {
          onPreviewPicture: handlePreviewPicture,
          onLikeCard: handleLikeCard,
          onDeleteCard: handleDeleteCard,
        })
      );
    });
  })
  .catch((err) => {
    console.log(err);
  });
