FILES = module.json timecodeExpertModule.js icon.png
BUILD_DIR = .build
BUILD_ARTIFACT_DIR = $(BUILD_DIR)/artifacts
ZIP_NAME = Timecode-Expert-2-Chataigne-Module-latest.zip

all: setup zip

setup:
	mkdir -p $(BUILD_ARTIFACT_DIR)
	cp $(FILES) $(BUILD_ARTIFACT_DIR)

zip: setup
	zip -j -r $(BUILD_DIR)/$(ZIP_NAME) $(BUILD_ARTIFACT_DIR)

clean:
	rm -rf $(BUILD_DIR)
