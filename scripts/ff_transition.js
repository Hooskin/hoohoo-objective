(() => {
  // Register settings in init so they appear in the Module Settings
  Hooks.once('init', () => {
    game.settings.register('hoohoo-objective', 'enabled', {
      name: 'hoohoo-objective.settings.enabled.name',
      hint: 'hoohoo-objective.settings.enabled.hint',
      scope: 'world',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register('hoohoo-objective', 'gmOnly', {
      name: 'hoohoo-objective.settings.gmOnly.name',
      hint: 'hoohoo-objective.settings.gmOnly.hint',
      scope: 'client',
      config: true,
      type: Boolean,
      default: true
    });

    game.settings.register('hoohoo-objective', 'text', {
      name: 'hoohoo-objective.settings.text.name',
      hint: 'hoohoo-objective.settings.text.hint',
      scope: 'world',
      config: true,
      type: String,
      default: 'BATTLE'
    });

    game.settings.register('hoohoo-objective', 'soundPath', {
      name: 'hoohoo-objective.settings.soundPath.name',
      hint: 'hoohoo-objective.settings.soundPath.hint',
      scope: 'world',
      config: true,
      type: String,
      default: ''
    });

    game.settings.register('hoohoo-objective', 'volume', {
      name: 'hoohoo-objective.settings.volume.name',
      hint: 'hoohoo-objective.settings.volume.hint',
      scope: 'client',
      config: true,
      type: Number,
      range: { min: 0, max: 1, step: 0.05 },
      default: 0.8
    });
  });

  Hooks.once('ready', () => {
    console.log('hoohoo-objective | FF transition ready');

    const showTransition = (text) => {
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

        // Use a single timeout cleanup after the full animation duration to avoid
        // prematurely removing the overlay when one animation finishes.
        const totalMs = 2800; // matches CSS timings + small buffer
        setTimeout(() => {
          try { if (overlay && overlay.parentElement) overlay.remove(); } catch (e) {}
        }, totalMs);
      } catch (err) {
        // Don't throw, keep Foundry flow working
        console.error('hoohoo-objective | FF transition error', err);
      }
    };

    const playSoundIfConfigured = () => {
      try {
        const path = game.settings.get('hoohoo-objective', 'soundPath');
        const volume = game.settings.get('hoohoo-objective', 'volume') ?? 0.8;
        if (!path || path === '') return;
        // Play the configured sound path (module author may provide a packaged default)
        AudioHelper.play({src: path, volume: volume, loop: false}, false);
      } catch (e) {
        // ignore missing file or play errors
      }
    };

    // Listen to combatStart (triggered when pressing "Begin Combat") instead of createCombat
    Hooks.on('combatStart', (combat, updateData, options) => {
      const enabled = game.settings.get('hoohoo-objective', 'enabled');
      if (!enabled) return;

      const gmOnly = game.settings.get('hoohoo-objective', 'gmOnly');
      if (gmOnly && !game.user?.isGM) return;

      const text = game.settings.get('hoohoo-objective', 'text') || 'BATTLE';

      showTransition(text);
      playSoundIfConfigured();
    });
  });
})();
