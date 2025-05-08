VERSION := $(shell cat VERSION.txt)
VERSION_PATTERN = [[:digit:]]*\.[[:digit:]]*\.[[:digit:]]*

FILES = module.json timecodeExpertModule.js icon.png version.txt
BUILD_DIR = .build
BUILD_SOURCE_DIR = $(BUILD_DIR)/src
BUILD_ARTIFACT_DIR = $(BUILD_DIR)/artifacts
FILENAME_BASE = Timecode-Expert-2-Chataigne-Module
ZIP_FILENAME_LATEST = $(FILENAME_BASE)-latest.zip
ZIP_FILENAME_VERSIONED = $(FILENAME_BASE)-$(VERSION).zip

all: setup zip

setup:
	mkdir -p $(BUILD_SOURCE_DIR) $(BUILD_ARTIFACT_DIR)
	sed -i '' "s/\"$(VERSION_PATTERN)\"/\"$(VERSION)\"/g" module.json
	sed -i '' "s/v$(VERSION_PATTERN)/v$(VERSION)/g" module.json
	cp $(FILES) $(BUILD_SOURCE_DIR)

zip: setup
	@echo "Zipping $(VERSION) for Release"
	zip -j -r $(BUILD_ARTIFACT_DIR)/$(ZIP_FILENAME_LATEST) $(BUILD_SOURCE_DIR)
	cp $(BUILD_ARTIFACT_DIR)/$(ZIP_FILENAME_LATEST) $(BUILD_ARTIFACT_DIR)/$(ZIP_FILENAME_VERSIONED)

clean:
	rm -rf $(BUILD_DIR)
