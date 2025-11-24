import warnings

# Silence noisy deprecation warnings from framework/deps during tests
warnings.filterwarnings("ignore", category=DeprecationWarning)
