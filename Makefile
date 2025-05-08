VERSION := $(shell cat VERSION.txt)

FILES = module.json timecodeExpertModule.js icon.png version.txt
BUILD_DIR = .build
BUILD_ARTIFACT_DIR = $(BUILD_DIR)/artifacts
FILENAME_BASE = Timecode-Expert-2-Chataigne-Module
ZIP_FILENAME_LATEST = $(FILENAME_BASE)-latest.zip
ZIP_FILENAME_VERSIONED = $(FILENAME_BASE)-$(VERSION).zip

all: setup zip

setup:
	mkdir -p $(BUILD_ARTIFACT_DIR)
	cp $(FILES) $(BUILD_ARTIFACT_DIR)

zip: setup
	@echo "Zipping $(VERSION) for Release"
	zip -j -r $(BUILD_DIR)/$(ZIP_FILENAME_LATEST) $(BUILD_ARTIFACT_DIR)
	cp $(BUILD_DIR)/$(ZIP_FILENAME_LATEST) $(BUILD_DIR)/$(ZIP_FILENAME_VERSIONED)

clean:
	rm -rf $(BUILD_DIR)
