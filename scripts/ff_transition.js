(() => {
  console.log('hoohoo-objective | script loaded');
  // Small helper UI: FormApplication to manage message table
  class MessageTableApp extends FormApplication {
    static get defaultOptions() {
      return mergeObject(super.defaultOptions, {
        id: 'hoohoo-message-table',
        title: 'Gérer la table de messages - HooHoo Objective',
        classes: ['sheet'],
        template: 'modules/hoohoo-objective/templates/message-table.html',
        width: 600
      });
    }

    getData() {
      const messages = game.settings.get('hoohoo-objective', 'messageTable') || [];
      return { messages };
    }

    activateListeners(html) {
      super.activateListeners(html);
      html.find('.hoohoo-add-message').on('click', (ev) => {
        ev.preventDefault();
        const list = html.find('.hoohoo-message-list');
        const newInput = $(`<div class="hoohoo-message-row"><input class="hoohoo-message-input" type="text" value="" placeholder="Nouveau message..." /><button class="hoohoo-remove-message">Supprimer</button></div>`);
        list.append(newInput);
        newInput.find('.hoohoo-remove-message').on('click', () => newInput.remove());
      });

      html.find('.hoohoo-remove-message').on('click', function(ev) {
        ev.preventDefault();
        $(this).closest('.hoohoo-message-row').remove();
      });
    }

    async _updateObject(event, formData) {
      const inputs = this.element.find('.hoohoo-message-input').toArray();
      const messages = inputs.map(i => i.value?.trim()).filter(Boolean);
      await game.settings.set('hoohoo-objective', 'messageTable', messages);
      ui.notifications.info('Table de messages mise à jour.');
    }
  }

  // Register settings in init so they appear in the Module Settings
  Hooks.once('init', () => {
    console.log('hoohoo-objective | init');
    game.settings.register('hoohoo-objective', 'enabled', {
      name: 'Activer l\'animation Final Fantasy',
      hint: 'Affiche une transition de type Final Fantasy lors de la création d\'une rencontre',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register('hoohoo-objective', 'gmOnly', {
      name: 'Visible uniquement par le MJ',
      hint: 'Si activé, seuls les utilisateurs MJ verront l\'animation. Désactivé par défaut (visible par tous).',
      scope: 'client',
      config: true,
      type: Boolean,
      default: false
    });

    game.settings.register('hoohoo-objective', 'defaultText', {
      name: 'Texte par défaut',
      hint: 'Texte affiché si la table de messages est vide',
      scope: 'world',
      config: true,
      type: String,
      default: 'BATAILLE'
    });

    game.settings.register('hoohoo-objective', 'soundPath', {
      name: 'Chemin du son (optionnel)',
      hint: 'Chemin vers un fichier audio à jouer lors de la transition (ex: modules/monmodule/sounds/ff.wav)',
      scope: 'world',
      config: true,
      type: String,
      default: ''
    });

    game.settings.register('hoohoo-objective', 'volume', {
      name: 'Volume du son',
      hint: 'Volume du son de transition (0.0 - 1.0)',
      scope: 'client',
      config: true,
      type: Number,
      range: { min: 0, max: 1, step: 0.05 },
      default: 0.8
    });

    // Store the message table as an Object (array)
    game.settings.register('hoohoo-objective', 'messageTable', {
      name: 'Table de messages',
      hint: 'Liste des messages utilisés pour la transition (modifiable via le bouton Gérer).',
      scope: 'world',
      config: false,
      type: Object,
      default: ['BATAILLE']
    });

    // Register a menu button to open the message table manager (GM only)
    try {
      game.settings.registerMenu('hoohoo-objective', 'manageMessages', {
        name: 'Gérer la table de messages',
        label: 'Gérer',
        hint: 'Ouvre une interface pour ajouter/supprimer les messages affichés lors d\'une rencontre',
        icon: 'fas fa-list',
        type: MessageTableApp,
        restricted: true
      });
      console.log('hoohoo-objective | registerMenu OK');
    } catch (err) {
      console.error('hoohoo-objective | registerMenu failed', err);
    }
  });

  Hooks.once('ready', () => {
    console.log('hoohoo-objective | ready');

    const showTransition = (text) => {
      console.log('hoohoo-objective | showTransition', text);
      try {
        if (typeof document === 'undefined') return;
        const overlay = document.createElement('div');
        overlay.className = 'hoohoo-ff-overlay';
        overlay.innerHTML = `
          <div class="hoohoo-ff-bar hoohoo-ff-top"></div>
          <div class="hoohoo-ff-bar hoohoo-ff-bottom"></div>
          <div class="hoohoo-ff-center"><div class="hoohoo-ff-text">${text}</div></div>
        `;
        document.body.appendChild(overlay);

        const totalMs = 2800; // matches CSS timings + small buffer
        setTimeout(() => {
          try { if (overlay && overlay.parentElement) overlay.remove(); } catch (e) {}
        }, totalMs);
      } catch (err) {
        console.error('hoohoo-objective | FF transition error', err);
      }
    };

    const playSoundIfConfigured = () => {
      try {
        console.log('hoohoo-objective | playSoundIfConfigured');
        const path = game.settings.get('hoohoo-objective', 'soundPath');
        const volume = game.settings.get('hoohoo-objective', 'volume') ?? 0.8;
        if (!path || path === '') {
          console.log('hoohoo-objective | no soundPath configured');
          return;
        }
        console.log('hoohoo-objective | playing sound', path, volume);
        AudioHelper.play({src: path, volume: volume, loop: false}, false);
      } catch (e) {
        console.error('hoohoo-objective | playSound error', e);
      }
    };

    // Trigger when the encounter is started (Begin Encounter)
    Hooks.on('combatStart', (combat, updateData, options) => {
      try {
        console.log('hoohoo-objective | combatStart triggered', {combatId: combat?.id, updateData, options});
        const enabled = game.settings.get('hoohoo-objective', 'enabled');
        console.log('hoohoo-objective | enabled =', enabled);
        if (!enabled) {
          console.log('hoohoo-objective | disabled by settings');
          return;
        }

        const gmOnly = game.settings.get('hoohoo-objective', 'gmOnly');
        console.log('hoohoo-objective | gmOnly =', gmOnly, 'currentUserIsGM =', game.user?.isGM);
        if (gmOnly && !game.user?.isGM) {
          console.log('hoohoo-objective | skipping for non-GM client');
          return;
        }

        const table = game.settings.get('hoohoo-objective', 'messageTable') || [];
        const defaultText = game.settings.get('hoohoo-objective', 'defaultText') || 'BATAILLE';
        // Build a dialog with a dropdown populated from the message table
        const optionsHtml = (Array.isArray(table) && table.length > 0)
          ? table.map((m, i) => `<option value="${i}">${m}</option>`).join('\n')
          : `<option value="-1">${defaultText}</option>`;

        const content = `
          <div class="form-group">
            <label>Sélectionnez le message pour la transition</label>
            <div class="form-fields">
              <select name="messageChoice">${optionsHtml}</select>
            </div>
          </div>`;

        new Dialog({
          title: 'Begin Encounter — Choix du message',
          content,
          buttons: {
            ok: {
              icon: '<i class="fas fa-check"></i>',
              label: 'Valider',
              callback: (html) => {
                try {
                  const val = html.find('select[name="messageChoice"]').val();
                  let text = defaultText;
                  if (val !== undefined && parseInt(val) >= 0 && Array.isArray(table) && table.length > 0) {
                    const idx = parseInt(val);
                    if (!Number.isNaN(idx) && table[idx] !== undefined) text = table[idx];
                  }
                  console.log('hoohoo-objective | dialog selection =', text);
                  showTransition(text);
                  playSoundIfConfigured();
                } catch (e) {
                  console.error('hoohoo-objective | dialog ok callback error', e);
                }
              }
            },
            cancel: {
              icon: '<i class="fas fa-times"></i>',
              label: 'Annuler',
              callback: () => { console.log('hoohoo-objective | dialog cancelled'); }
            }
          },
          default: 'ok'
        }).render(true);
      } catch (err) {
        console.error('hoohoo-objective | createCombat handler error', err);
      }
    });
  });
})();
